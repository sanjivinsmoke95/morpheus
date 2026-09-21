"""Recommendations with traceability + evidence, and the 'why not' view."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Evidence, Recommendation, RecommendationEvidence, Standard, User
from app.schemas.slice import EvidenceRead, RecommendationRead, StandardMini

router = APIRouter(tags=["recommendations"])


def _read(db: Session, rec: Recommendation) -> RecommendationRead:
    std = db.get(Standard, rec.standard_id)
    ev_ids = [re.evidence_id for re in db.execute(
        select(RecommendationEvidence).where(RecommendationEvidence.recommendation_id == rec.id)).scalars()]
    evidence = list(db.execute(select(Evidence).where(Evidence.id.in_(ev_ids))).scalars()) if ev_ids else []
    return RecommendationRead(
        id=rec.id, requirement_id=rec.requirement_id, standard=StandardMini.model_validate(std),
        applicability_class=rec.applicability_class, relevance=rec.relevance, relevance_score=rec.relevance_score,
        retrieval_method=rec.retrieval_method, signals=rec.signals_json, rationale=rec.rationale,
        confidence=rec.confidence, final_rank=rec.final_rank, is_primary=rec.is_primary,
        review_status=rec.review_status, excluded=rec.excluded, exclusion_reason=rec.exclusion_reason,
        evidence=[EvidenceRead.model_validate(e) for e in evidence],
    )


@router.get("/analyses/{analysis_id}/recommendations", response_model=list[RecommendationRead])
def list_recommendations(
    analysis_id: str,
    requirement_id: str | None = None,
    include_excluded: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Recommendation).where(Recommendation.analysis_id == analysis_id)
    if requirement_id:
        stmt = stmt.where(Recommendation.requirement_id == requirement_id)
    if not include_excluded:
        stmt = stmt.where(Recommendation.excluded == False)  # noqa: E712
    stmt = stmt.order_by(Recommendation.requirement_id, Recommendation.final_rank)
    return [_read(db, r) for r in db.execute(stmt).scalars()]


@router.get("/recommendations/{recommendation_id}", response_model=RecommendationRead)
def get_recommendation(recommendation_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rec = db.get(Recommendation, recommendation_id)
    if not rec:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recommendation not found.")
    return _read(db, rec)


@router.get("/requirements/{requirement_id}/alternatives")
def alternatives(requirement_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    recs = db.execute(select(Recommendation).where(
        Recommendation.requirement_id == requirement_id, Recommendation.excluded == False)  # noqa: E712
        .order_by(Recommendation.final_rank)).scalars().all()
    if not recs:
        return {"primary": None, "alternatives": [], "related": []}
    primary = next((r for r in recs if r.is_primary), recs[0])
    others = [r for r in recs if r.id != primary.id]
    alts = [r for r in others if r.applicability_class not in ("RELATED", "NOT_APPLICABLE")]
    related = [r for r in others if r.applicability_class == "RELATED"]
    return {"primary": _read(db, primary),
            "alternatives": [_read(db, r) for r in alts],
            "related": [_read(db, r) for r in related]}


@router.get("/recommendations/{recommendation_id}/why-not")
def why_not(recommendation_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    rec = db.get(Recommendation, recommendation_id)
    if not rec:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recommendation not found.")
    s = rec.signals_json or {}
    return {
        "excluded": rec.excluded,
        "exclusion_reason": rec.exclusion_reason,
        "signals": s,
        "scope_mismatch": s.get("scope_match", 0) < 0.3,
        "product_mismatch": not s.get("product_match"),
        "parameter_mismatch": not s.get("parameter_match"),
        "classification_reason": rec.rationale,
    }
