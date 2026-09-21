"""Phase 6 API: HS classification, historical comparison, copilot, feedback."""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.models import Analysis, Feedback, User
from app.models.enums import Role
from app.services.advanced.service import classify_hs, compare_to_history, copilot_drafts

router = APIRouter(tags=["advanced"])


@router.post("/hs/classify")
def hs_classify(text: str = Body(..., embed=True), _: User = Depends(get_current_user)) -> dict:
    return {"candidates": classify_hs(text),
            "disclaimer": "HS suggestions are an aid, not a customs classification authority."}


@router.get("/analyses/{analysis_id}/history-compare")
def history_compare(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    return compare_to_history(db, analysis)


@router.get("/analyses/{analysis_id}/copilot")
def copilot(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    return copilot_drafts(db, analysis)


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    analysis_id: str = Body(...), recommendation_id: str | None = Body(default=None),
    decision: str = Body(...), reason: str = Body(default=""),
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
) -> dict:
    fb = Feedback(analysis_id=analysis_id, recommendation_id=recommendation_id,
                  user_id=user.id, decision=decision, reason=reason)
    db.add(fb)
    db.commit()
    return {"id": fb.id, "status": "recorded"}


@router.get("/feedback")
def list_feedback(db: Session = Depends(get_db), _: User = Depends(require_roles(Role.ADMIN))) -> list[dict]:
    rows = db.execute(select(Feedback).order_by(Feedback.created_at.desc())).scalars().all()
    return [{"id": f.id, "analysis_id": f.analysis_id, "recommendation_id": f.recommendation_id,
             "decision": f.decision, "reason": f.reason, "created_at": f.created_at.isoformat()} for f in rows]
