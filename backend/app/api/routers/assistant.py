"""Evidence clause view + deterministic 'Ask MORPHEUS' assistant.

The assistant is keyless and grounded: it answers only from evidence already stored
for this analysis (matched clauses, standard scopes, QCO records). When it cannot
find supporting evidence it abstains — it never invents a standard, clause or status.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Body, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import (
    DocumentPage, Evidence, QcoRecord, Recommendation, RecommendationEvidence,
    Requirement, Standard, User, Analysis,
)

router = APIRouter(tags=["assistant"])

_IS_RE = re.compile(r"IS\s?\d{3,5}", re.IGNORECASE)
_STOP = {"the", "a", "an", "is", "of", "for", "and", "to", "what", "which", "does",
         "do", "in", "on", "are", "this", "that", "how", "standard", "standards",
         "tender", "requirement", "requirements", "morpheus", "show", "me", "with"}


def _recs(db: Session, analysis_id: str) -> list[Recommendation]:
    return list(db.execute(select(Recommendation).where(
        Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)).scalars())  # noqa: E712


@router.get("/analyses/{analysis_id}/clauses")
def clauses(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    """Document pages with the standards each matched clause supports."""
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        return []
    pages = db.execute(select(DocumentPage).where(
        DocumentPage.document_id == analysis.document_id).order_by(DocumentPage.page_number)).scalars().all()
    std_by_id = {s.id: s for s in db.execute(select(Standard)).scalars()}

    # Map page -> [{is_number, title, evidence_text, role}] via evidence links.
    recs = _recs(db, analysis_id)
    rec_by_id = {r.id: r for r in recs}
    links = db.execute(select(RecommendationEvidence).where(
        RecommendationEvidence.recommendation_id.in_(list(rec_by_id.keys())))).scalars().all() if recs else []
    ev_by_id = {e.id: e for e in db.execute(select(Evidence)).scalars()}

    page_hits: dict[int, list[dict]] = {}
    for link in links:
        ev = ev_by_id.get(link.evidence_id)
        rec = rec_by_id.get(link.recommendation_id)
        if not ev or not rec or ev.source_type != "tender_document" or ev.page is None:
            continue
        std = std_by_id.get(rec.standard_id)
        if not std:
            continue
        page_hits.setdefault(ev.page, []).append({
            "is_number": std.is_number, "title": std.title,
            "evidence_text": ev.text, "role": link.role,
            "relevance": rec.relevance,
        })

    out = []
    for p in pages:
        hits = page_hits.get(p.page_number, [])
        # dedup by is_number keeping first
        seen, uniq = set(), []
        for h in hits:
            if h["is_number"] not in seen:
                seen.add(h["is_number"]); uniq.append(h)
        out.append({
            "page_number": p.page_number,
            "text_excerpt": (p.text[:1200] + "…") if len(p.text) > 1200 else p.text,
            "standards": uniq,
        })
    return out


@router.post("/analyses/{analysis_id}/ask")
def ask(analysis_id: str, question: str = Body(..., embed=True),
        db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    """Deterministic, evidence-grounded answer. Abstains when unsupported."""
    q = (question or "").strip()
    if not q:
        return {"answer": "Please enter a question.", "abstained": True, "citations": []}

    recs = _recs(db, analysis_id)
    std_by_id = {s.id: s for s in db.execute(select(Standard)).scalars()}
    reqs = {r.id: r for r in db.execute(select(Requirement).where(
        Requirement.analysis_id == analysis_id)).scalars()}

    # 1) Direct IS-number question.
    is_matches = [m.group(0).upper().replace(" ", "") for m in _IS_RE.finditer(q)]
    if is_matches:
        for rec in recs:
            std = std_by_id.get(rec.standard_id)
            if not std:
                continue
            norm = std.is_number.upper().replace(" ", "")
            if any(m in norm for m in is_matches):
                qco = db.execute(select(QcoRecord).where(
                    QcoRecord.standard_id == std.id)).scalar_one_or_none()
                cert = f" It is {qco.qco_status} under {qco.order_name}." if qco and qco.order_name else ""
                req = reqs.get(rec.requirement_id)
                return {
                    "answer": f"{std.is_number} ({std.title}) is a {rec.relevance.lower()}-relevance "
                              f"{rec.applicability_class.replace('_', ' ').lower()} match"
                              + (f" for requirement {req.req_code}." if req else ".") + cert,
                    "abstained": False,
                    "citations": [{"is_number": std.is_number, "text": std.scope[:200]}],
                }
        return {"answer": f"No evidence found for {is_matches[0]} in this analysis. It was not matched "
                          "to any requirement in the uploaded document.", "abstained": True, "citations": []}

    # 2) QCO / mandatory / certification question.
    if re.search(r"qco|mandatory|certif|bis|isi|crs", q, re.IGNORECASE):
        ids = [r.standard_id for r in recs]
        rows = db.execute(select(QcoRecord).where(
            QcoRecord.standard_id.in_(ids), QcoRecord.qco_status == "MANDATORY")).scalars().all() if ids else []
        if rows:
            names = [std_by_id[r.standard_id].is_number for r in rows if r.standard_id in std_by_id]
            return {
                "answer": f"{len(names)} matched standard(s) are QCO-mandatory: {', '.join(names)}. "
                          "Bidders must hold valid BIS certification for these; reject uncertified offers.",
                "abstained": False,
                "citations": [{"is_number": std_by_id[r.standard_id].is_number,
                               "text": r.order_name or r.product_description} for r in rows if r.standard_id in std_by_id],
            }
        return {"answer": "No QCO-mandatory standards were found among the matches for this tender.",
                "abstained": True, "citations": []}

    # 3) Keyword search over standard scopes + titles.
    terms = [w for w in re.findall(r"[a-zA-Z]{3,}", q.lower()) if w not in _STOP]
    scored: list[tuple[int, Recommendation]] = []
    for rec in recs:
        std = std_by_id.get(rec.standard_id)
        if not std:
            continue
        hay = f"{std.title} {std.scope} {' '.join(std.keywords or [])}".lower()
        score = sum(1 for t in terms if t in hay)
        if score:
            scored.append((score, rec))
    scored.sort(key=lambda x: (x[0], x[1].relevance_score), reverse=True)
    if scored:
        top = [r for _, r in scored[:3]]
        cites = [{"is_number": std_by_id[r.standard_id].is_number, "text": std_by_id[r.standard_id].scope[:180]}
                 for r in top]
        listed = "; ".join(f"{c['is_number']} ({std_by_id[r.standard_id].title})" for c, r in zip(cites, top))
        return {"answer": f"Based on the matched standards, the most relevant are: {listed}.",
                "abstained": False, "citations": cites}

    return {"answer": "No evidence found in this analysis to answer that. Try naming a standard "
                      "(e.g. 'IS 16107') or asking about QCO/certification.", "abstained": True, "citations": []}
