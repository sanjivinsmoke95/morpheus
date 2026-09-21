"""Human review decisions — persisted with immutable AI + evidence snapshots."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.models import Evidence, Recommendation, RecommendationEvidence, Review, ReviewDecision, User
from app.models.enums import Role
from app.schemas.slice import ReviewDecisionCreate, ReviewDecisionRead

router = APIRouter(tags=["reviews"])

_STATUS_MAP = {"ACCEPT": "ACCEPTED", "REJECT": "REJECTED", "MARK_FOR_REVIEW": "REVIEW"}


def _get_or_create_review(db: Session, analysis_id: str, user: User) -> Review:
    review = db.execute(
        select(Review).where(Review.analysis_id == analysis_id, Review.reviewer_id == user.id)
    ).scalar_one_or_none()
    if not review:
        review = Review(analysis_id=analysis_id, reviewer_id=user.id, status="OPEN")
        db.add(review)
        db.flush()
    return review


def _snapshot(db: Session, target_type: str, target_id: str) -> tuple[dict, list]:
    if target_type != "recommendation":
        return {}, []
    rec = db.get(Recommendation, target_id)
    if not rec:
        return {}, []
    ev_ids = [re.evidence_id for re in db.execute(
        select(RecommendationEvidence).where(RecommendationEvidence.recommendation_id == rec.id)).scalars()]
    evs = list(db.execute(select(Evidence).where(Evidence.id.in_(ev_ids))).scalars()) if ev_ids else []
    ai = {"applicability_class": rec.applicability_class, "relevance": rec.relevance,
          "confidence": rec.confidence, "rationale": rec.rationale, "standard_id": rec.standard_id}
    snap = [{"id": e.id, "source_type": e.source_type, "text": e.text, "data_origin": e.data_origin} for e in evs]
    return ai, snap


@router.post("/analyses/{analysis_id}/reviews/decisions", response_model=ReviewDecisionRead,
             status_code=status.HTTP_201_CREATED)
def record_decision(
    analysis_id: str,
    payload: ReviewDecisionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.OFFICER, Role.REVIEWER, Role.ADMIN)),
):
    review = _get_or_create_review(db, analysis_id, user)
    ai_snap, ev_snap = _snapshot(db, payload.target_type, payload.target_id)
    decision = ReviewDecision(
        review_id=review.id, target_type=payload.target_type, target_id=payload.target_id,
        decision=payload.decision, reason=payload.reason, ai_snapshot_json=ai_snap,
        evidence_snapshot_json=ev_snap, decided_by=user.id,
    )
    db.add(decision)
    # Reflect the decision on the recommendation's review_status.
    if payload.target_type == "recommendation":
        rec = db.get(Recommendation, payload.target_id)
        if rec:
            rec.review_status = _STATUS_MAP.get(payload.decision, rec.review_status)
    db.commit()
    return decision


@router.get("/analyses/{analysis_id}/reviews/decisions", response_model=list[ReviewDecisionRead])
def list_decisions(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    reviews = db.execute(select(Review).where(Review.analysis_id == analysis_id)).scalars().all()
    ids = [r.id for r in reviews]
    if not ids:
        return []
    return list(db.execute(
        select(ReviewDecision).where(ReviewDecision.review_id.in_(ids)).order_by(ReviewDecision.created_at)
    ).scalars())
