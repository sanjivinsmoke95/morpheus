"""Human review decisions — persisted with immutable AI + evidence snapshots."""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.models import (
    Analysis, Evidence, Recommendation, RecommendationEvidence, Requirement, Review, ReviewDecision,
    Standard, User,
)
from app.models.enums import Role
from app.schemas.slice import ReviewDecisionCreate, ReviewDecisionRead
from app.services.evidence import assemble

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


@router.post("/analyses/{analysis_id}/reviews/add-standard", response_model=ReviewDecisionRead,
             status_code=status.HTTP_201_CREATED)
def add_standard(
    analysis_id: str,
    requirement_id: str = Body(...),
    is_number: str = Body(...),
    reason: str = Body(default=""),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.OFFICER, Role.REVIEWER, Role.ADMIN)),
):
    """Officer adds an existing standard to a requirement during review. This does
    NOT create an authoritative record — it references a standard that must already
    exist, and logs an ADD_STANDARD decision."""
    analysis = db.get(Analysis, analysis_id)
    requirement = db.get(Requirement, requirement_id)
    std = db.execute(select(Standard).where(Standard.is_number == is_number)).scalar_one_or_none()
    if not analysis or not requirement:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis or requirement not found.")
    if not std:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            "That standard is not in the database — an admin must curate it first.")
    existing = db.execute(select(Recommendation).where(
        Recommendation.requirement_id == requirement_id, Recommendation.standard_id == std.id)).scalar_one_or_none()
    if not existing:
        rec = Recommendation(
            analysis_id=analysis_id, requirement_id=requirement_id, standard_id=std.id,
            applicability_class="CONDITIONAL", relevance="MEDIUM", relevance_score=0.0,
            retrieval_method="officer", signals_json={"officer_added": 1},
            rationale="Added by an officer during review.", confidence="MEDIUM",
            review_status="ACCEPTED", is_primary=False,
        )
        db.add(rec)
        db.flush()
        tender_ev = assemble.tender_evidence(db, requirement, analysis.document_id)
        std_ev = assemble.standard_evidence(db, std)
        db.add(RecommendationEvidence(recommendation_id=rec.id, evidence_id=tender_ev.id, role="officer"))
        db.add(RecommendationEvidence(recommendation_id=rec.id, evidence_id=std_ev.id, role="scope"))
        target_id = rec.id
    else:
        target_id = existing.id

    review = _get_or_create_review(db, analysis_id, user)
    decision = ReviewDecision(review_id=review.id, target_type="recommendation", target_id=target_id,
                              decision="ADD_STANDARD", reason=reason or f"Added {is_number}", decided_by=user.id)
    db.add(decision)
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


@router.get("/analyses/{analysis_id}/comments")
def list_comments(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    from app.models import AnalysisComment
    rows = db.execute(select(AnalysisComment).where(
        AnalysisComment.analysis_id == analysis_id).order_by(AnalysisComment.created_at)).scalars().all()
    authors = {u.id: u for u in db.execute(select(User)).scalars()}
    return [{"id": c.id, "kind": c.kind, "body": c.body,
             "author": authors[c.author_id].full_name if c.author_id in authors else None,
             "role": authors[c.author_id].role if c.author_id in authors else None,
             "created_at": c.created_at.isoformat() if c.created_at else None} for c in rows]


@router.post("/analyses/{analysis_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(analysis_id: str, body: str = Body(..., embed=True), kind: str = Body(default="comment", embed=True),
                db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    from app.models import AnalysisComment
    if not db.get(Analysis, analysis_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    c = AnalysisComment(analysis_id=analysis_id, author_id=user.id,
                        kind=kind if kind in ("comment", "signoff", "return") else "comment", body=body.strip())
    db.add(c)
    # Reviewer sign-off / return transitions the workflow (Phase 17).
    a = db.get(Analysis, analysis_id)
    if kind == "signoff":
        a.workflow_status = "FINALIZED"
    elif kind == "return":
        a.workflow_status = "UNDER_REVIEW"
    db.commit()
    return {"id": c.id, "kind": c.kind, "body": c.body, "author": user.full_name,
            "role": user.role, "created_at": c.created_at.isoformat() if c.created_at else None}
