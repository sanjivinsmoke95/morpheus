"""Requirement matrix: list + officer edit (which re-runs downstream analysis)."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Requirement, RequirementAttribute, User
from app.schemas.slice import RequirementAttributeRead, RequirementRead, RequirementUpdate
from app.services.orchestrator.pipeline import rerun_requirement

router = APIRouter(tags=["requirements"])


def req_read(db: Session, req: Requirement) -> RequirementRead:
    attrs = db.execute(
        select(RequirementAttribute).where(RequirementAttribute.requirement_id == req.id)
    ).scalars().all()
    return RequirementRead(
        id=req.id, req_code=req.req_code, requirement_type=req.requirement_type, description=req.description,
        source_page=req.source_page, source_section=req.source_section, confidence=req.confidence,
        extraction_method=req.extraction_method, is_edited=req.is_edited,
        attributes=[RequirementAttributeRead.model_validate(a) for a in attrs],
    )


@router.get("/analyses/{analysis_id}/requirements", response_model=list[RequirementRead])
def list_requirements(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    reqs = db.execute(
        select(Requirement).where(Requirement.analysis_id == analysis_id).order_by(Requirement.req_code)
    ).scalars().all()
    return [req_read(db, r) for r in reqs]


@router.patch("/requirements/{requirement_id}", response_model=RequirementRead)
def update_requirement(
    requirement_id: str,
    payload: RequirementUpdate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    req = db.get(Requirement, requirement_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found.")
    changes = payload.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(req, k, v)
    req.is_edited = True
    req.extraction_method = "edited"
    db.commit()
    # Editing changes downstream results → re-recommend just this requirement.
    background.add_task(rerun_requirement, req.analysis_id, req.id)
    return req_read(db, req)
