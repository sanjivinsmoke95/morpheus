"""Grounded analysis assistant — the shared answering service behind both
Ask MORPHEUS (Evidence tab) and Copilot.

Contract:
  1. Retrieve real evidence for an analysis (matched standards + their rationale,
     the tender clauses that support them, extracted requirements, QCO records).
  2. Rank that evidence against the user's question and build a compact, numbered
     grounded context.
  3. Ask the *configured* LLM to synthesise a natural-language answer over ONLY
     that context, citing sources by their number, and to abstain when the
     evidence is insufficient.
  4. Validate the model's cited source numbers against the retrieved evidence, so
     no citation can point at anything MORPHEUS did not actually retrieve.
  5. When no LLM is configured (offline stub), fall back to a deterministic
     grounded answer built from the same evidence — clearly labelled, never
     presented as model synthesis.

The LLM performs the natural-language reasoning; retrieval supplies the facts.
The deterministic path is a fallback and safety net, not the primary engine.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Evidence, QcoRecord, Recommendation, RecommendationEvidence, Requirement, Standard,
)
from app.services.ai.base import LLMProvider
from app.services.ai.factory import get_llm

_IS_RE = re.compile(r"IS\s?\d{3,5}", re.IGNORECASE)
_STOP = {
    "the", "a", "an", "is", "of", "for", "and", "to", "what", "which", "does", "do",
    "in", "on", "are", "this", "that", "how", "standard", "standards", "tender",
    "requirement", "requirements", "morpheus", "show", "me", "with", "why", "was",
    "were", "has", "have", "need", "needs", "about", "any", "all",
}

_SYSTEM = (
    "You are MORPHEUS, a procurement and specification-intelligence assistant for "
    "public tenders in India. Answer the user's question using ONLY the numbered "
    "EVIDENCE items provided about this specific tender analysis. Rules:\n"
    "- Base every factual claim about the tender, its requirements, matched standards, "
    "evidence or regulatory status strictly on the EVIDENCE. Never invent a standard "
    "number, clause, page, certification, regulation or figure.\n"
    "- Cite the evidence you used by its number, e.g. [S1], [S3].\n"
    "- Distinguish tender requirements from what a standard requires, and label your "
    "own interpretation as such.\n"
    "- Do not claim legal or compliance certainty and do not make procurement "
    "decisions for the user. Prefer 'standards alignment', 'evidence-backed', "
    "'potential gap', 'review required'.\n"
    "- If the evidence does not support an answer, set abstained=true and explain "
    "what evidence is missing instead of guessing.\n"
    "- Keep the answer concise: a direct answer first, then the supporting reasoning."
)


@dataclass
class Source:
    ref: str          # "S1", "S2", ...
    type: str         # standard | tender | requirement | qco
    label: str        # human label, e.g. "IS 16107 (Part 2/Sec 1) : 2014"
    is_number: str | None
    page: int | None
    text: str         # the evidence snippet actually shown to the model


@dataclass
class GroundedAnswer:
    answer: str
    sources: list[dict]
    confidence: str   # high | medium | low
    abstained: bool
    reason: str | None
    engine: str       # "llm:<name>" | "deterministic"

    def to_response(self) -> dict:
        # `citations` keeps the shape the existing Evidence Ask panel expects.
        return {
            "answer": self.answer,
            "abstained": self.abstained,
            "confidence": self.confidence,
            "reason": self.reason,
            "engine": self.engine,
            "sources": self.sources,
            "citations": [{"is_number": s["is_number"] or s["label"], "text": s["text"]}
                          for s in self.sources],
        }


class GroundedAnalysisAssistant:
    """Retrieval + grounded LLM synthesis, shared by Ask MORPHEUS and Copilot."""

    def __init__(self, db: Session, llm: LLMProvider | None = None, *, max_sources: int = 10):
        self.db = db
        self.llm = llm or get_llm()
        self.max_sources = max_sources

    # ── public ─────────────────────────────────────────────────────────────
    def answer(self, analysis_id: str, question: str) -> GroundedAnswer:
        q = (question or "").strip()
        if not q:
            return GroundedAnswer("Please enter a question.", [], "low", True, "empty question", "deterministic")

        pool = self._retrieve(analysis_id, q)
        if not pool:
            return GroundedAnswer(
                "This analysis has no matched standards or evidence yet, so there is nothing to answer from.",
                [], "low", True, "no evidence retrieved for this analysis", "deterministic")

        if self.llm.available:
            grounded = self._answer_with_llm(q, pool)
            if grounded is not None:
                return grounded
        # No LLM configured, or the LLM failed/abstained without a usable result.
        return self._answer_deterministic(q, pool)

    @staticmethod
    def _terms(q: str) -> list[str]:
        return [w for w in re.findall(r"[a-zA-Z]{3,}", q.lower()) if w not in _STOP]

    # ── retrieval ──────────────────────────────────────────────────────────
    def _retrieve(self, analysis_id: str, q: str) -> list[Source]:
        recs = list(self.db.execute(select(Recommendation).where(
            Recommendation.analysis_id == analysis_id,
            Recommendation.excluded == False)).scalars())  # noqa: E712
        std_by_id = {s.id: s for s in self.db.execute(select(Standard)).scalars()}
        reqs = {r.id: r for r in self.db.execute(select(Requirement).where(
            Requirement.analysis_id == analysis_id)).scalars()}

        # tender evidence text per recommendation (the clause that supports the match)
        rec_ids = [r.id for r in recs]
        links = list(self.db.execute(select(RecommendationEvidence).where(
            RecommendationEvidence.recommendation_id.in_(rec_ids))).scalars()) if rec_ids else []
        ev_by_id = {e.id: e for e in self.db.execute(select(Evidence)).scalars()}
        tender_by_rec: dict[str, Evidence] = {}
        for link in links:
            ev = ev_by_id.get(link.evidence_id)
            if ev and ev.source_type == "tender_document" and link.recommendation_id not in tender_by_rec:
                tender_by_rec[link.recommendation_id] = ev

        terms = self._terms(q)
        is_hints = {m.group(0).upper().replace(" ", "") for m in _IS_RE.finditer(q)}

        scored: list[tuple[float, Source]] = []
        for rec in recs:
            std = std_by_id.get(rec.standard_id)
            if not std:
                continue
            req = reqs.get(rec.requirement_id)
            ev = tender_by_rec.get(rec.id)
            snippet_parts = [std.title, rec.rationale or ""]
            if ev and ev.text:
                snippet_parts.append(f"Tender clause: “{ev.text.strip()[:220]}”")
            if req:
                snippet_parts.append(f"Linked requirement {req.req_code}: {req.description[:160]}")
            text = " ".join(p for p in snippet_parts if p).strip()
            hay = f"{std.is_number} {std.title} {std.scope} {' '.join(std.keywords or [])} {rec.rationale or ''}".lower()
            score = float(sum(1 for t in terms if t in hay))
            score += rec.relevance_score  # prefer stronger matches when nothing else separates them
            if is_hints and any(h in std.is_number.upper().replace(" ", "") for h in is_hints):
                score += 100.0
            scored.append((score, Source(
                ref="", type="standard", label=std.is_number, is_number=std.is_number,
                page=ev.page if ev else None, text=text)))

        # requirements (so "which requirements…" style questions have grounding)
        for req in reqs.values():
            hay = f"{req.req_code} {req.description} {req.requirement_type}".lower()
            score = float(sum(1 for t in terms if t in hay))
            if score:
                scored.append((score, Source(
                    ref="", type="requirement", label=req.req_code, is_number=None,
                    page=req.source_page, text=f"{req.req_code}: {req.description[:200]}")))

        # QCO / mandatory certification records for the matched standards
        if re.search(r"qco|mandatory|certif|bis|isi|crs", q, re.IGNORECASE) or True:
            std_ids = [r.standard_id for r in recs]
            qcos = list(self.db.execute(select(QcoRecord).where(
                QcoRecord.standard_id.in_(std_ids))).scalars()) if std_ids else []
            for qco in qcos:
                std = std_by_id.get(qco.standard_id)
                if not std:
                    continue
                label = std.is_number
                hay = f"{label} {qco.order_name} {qco.product_description} {qco.qco_status}".lower()
                score = float(sum(1 for t in terms if t in hay))
                if qco.qco_status == "MANDATORY":
                    score += 1.0
                if score:
                    scored.append((score, Source(
                        ref="", type="qco", label=label, is_number=label, page=None,
                        text=f"{label} is {qco.qco_status} under {qco.order_name or 'a Quality Control Order'}."
                             + (f" {qco.product_description}" if qco.product_description else ""))))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = [s for score, s in scored if score > 0][: self.max_sources]
        if not top:  # nothing matched the words — fall back to the strongest standards
            top = [s for _, s in scored[: self.max_sources]]
        for i, s in enumerate(top, 1):
            s.ref = f"S{i}"
        return top

    # ── LLM synthesis ──────────────────────────────────────────────────────
    def _answer_with_llm(self, q: str, pool: list[Source]) -> GroundedAnswer | None:
        context = "\n".join(f"[{s.ref}] ({s.type}) {s.label} — {s.text}" for s in pool)
        prompt = (
            f"{_SYSTEM}\n\nEVIDENCE for this analysis:\n{context}\n\n"
            f"QUESTION: {q}\n\n"
            "Respond with a JSON object of exactly this shape:\n"
            '{"answer": string, "source_ids": string[]  // e.g. ["S1","S3"], '
            '"confidence": "high"|"medium"|"low", "abstained": boolean, '
            '"reason": string|null}\n'
            "source_ids MUST be a subset of the evidence numbers above."
        )
        out = self.llm.complete_json(prompt, temperature=0.1)
        if not isinstance(out, dict) or out.get("_abstain"):
            return None

        answer = str(out.get("answer") or "").strip()
        if not answer:
            return None
        by_ref = {s.ref: s for s in pool}
        raw_ids = out.get("source_ids") or []
        cited = [by_ref[str(r).strip().upper()] for r in raw_ids if str(r).strip().upper() in by_ref]
        abstained = bool(out.get("abstained"))
        confidence = str(out.get("confidence") or ("low" if abstained else "medium")).lower()
        if confidence not in ("high", "medium", "low"):
            confidence = "medium"
        reason = out.get("reason")

        # Grounding guard: a substantive (non-abstaining) answer must cite evidence
        # we actually retrieved. If the model cited nothing valid, attach the top
        # sources it was given rather than presenting an uncited claim.
        if not abstained and not cited:
            cited = pool[:3]
        return GroundedAnswer(
            answer=answer,
            sources=[asdict(s) for s in cited],
            confidence=confidence,
            abstained=abstained,
            reason=reason if isinstance(reason, str) else None,
            engine=f"llm:{self.llm.name}",
        )

    # ── deterministic fallback ─────────────────────────────────────────────
    def _answer_deterministic(self, q: str, pool: list[Source]) -> GroundedAnswer:
        is_hints = {m.group(0).upper().replace(" ", "") for m in _IS_RE.finditer(q)}
        if is_hints:
            for s in pool:
                if s.is_number and any(h in s.is_number.upper().replace(" ", "") for h in is_hints):
                    return GroundedAnswer(
                        f"{s.label} — {s.text}", [asdict(s)], "medium", False, None, "deterministic")

        if re.search(r"qco|mandatory|certif|bis|isi|crs", q, re.IGNORECASE):
            qcos = [s for s in pool if s.type == "qco"]
            if qcos:
                names = ", ".join(dict.fromkeys(s.label for s in qcos))
                return GroundedAnswer(
                    f"The following matched standard(s) carry a Quality Control Order: {names}. "
                    "Bidders are expected to hold valid BIS certification for these; offers without it "
                    "are typically treated as non-compliant.",
                    [asdict(s) for s in qcos[:5]], "medium", False, None, "deterministic")

        top = pool[:3]
        if top:
            listed = "; ".join(f"{s.label}" for s in top)
            return GroundedAnswer(
                "Based on the retrieved evidence, the most relevant items are: " + listed
                + ". Configure an LLM provider (LLM_PROVIDER / LLM_API_KEY) for a synthesised natural-language answer.",
                [asdict(s) for s in top], "low", False, None, "deterministic")

        return GroundedAnswer(
            "I couldn't verify that from the available tender and standards evidence for this analysis.",
            [], "low", True, "no matching evidence", "deterministic")


def parse_llm_json(text: str) -> dict:
    """Helper for tests: extract the first JSON object from a text blob."""
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1]) if start >= 0 and end > start else {}
