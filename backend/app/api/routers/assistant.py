"""Evidence clause view + grounded 'Ask MORPHEUS' assistant.

The clause view exposes the tender pages and the standards each matched clause
supports. The assistant delegates to the shared GroundedAnalysisAssistant, which
retrieves real evidence for the analysis and asks the configured LLM to synthesise
a grounded, cited answer (falling back to a deterministic grounded answer when no
LLM is configured). It never invents a standard, clause or status.
"""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import (
    DocumentPage, Evidence, Recommendation, RecommendationEvidence,
    Standard, User, Analysis,
)
from app.services.ai.grounded import GroundedAnalysisAssistant

router = APIRouter(tags=["assistant"])


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
    """Grounded answer over the analysis's real evidence.

    Uses the configured LLM to synthesise a natural-language, cited answer; falls
    back to a deterministic grounded answer when no LLM provider is configured.
    Abstains — with a reason — when the retrieved evidence is insufficient. Shared
    by the Evidence 'Ask MORPHEUS' panel and the Copilot page.
    """
    return GroundedAnalysisAssistant(db).answer(analysis_id, question).to_response()
