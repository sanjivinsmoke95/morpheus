"""Requirement matrix: list + officer edit (which re-runs downstream analysis)."""

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Analysis, Requirement, RequirementAttribute, RequirementNote, User
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


@router.post("/analyses/{analysis_id}/requirements", response_model=RequirementRead,
             status_code=status.HTTP_201_CREATED)
def add_requirement(
    analysis_id: str,
    background: BackgroundTasks,
    description: str = Body(..., embed=True),
    requirement_type: str = Body(default="PARAMETER", embed=True),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Officer adds a requirement the extractor missed; matching runs for it."""
    if not db.get(Analysis, analysis_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    n = db.execute(select(func.count()).select_from(Requirement).where(
        Requirement.analysis_id == analysis_id)).scalar_one()
    req = Requirement(
        analysis_id=analysis_id, req_code=f"R-{n + 1:03d}", requirement_type=requirement_type,
        description=description.strip(), confidence="HIGH", extraction_method="manual", is_edited=True,
    )
    db.add(req)
    db.commit()
    background.add_task(rerun_requirement, analysis_id, req.id)
    return req_read(db, req)


@router.get("/requirements/{requirement_id}/notes")
def list_notes(requirement_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    rows = db.execute(select(RequirementNote).where(
        RequirementNote.requirement_id == requirement_id).order_by(RequirementNote.created_at)).scalars().all()
    authors = {u.id: u for u in db.execute(select(User)).scalars()}
    return [{"id": n.id, "body": n.body, "created_at": n.created_at.isoformat() if n.created_at else None,
             "author": (authors[n.author_id].full_name if n.author_id in authors else None)} for n in rows]


@router.post("/requirements/{requirement_id}/notes", status_code=status.HTTP_201_CREATED)
def add_note(requirement_id: str, body: str = Body(..., embed=True),
             db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    req = db.get(Requirement, requirement_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found.")
    note = RequirementNote(requirement_id=requirement_id, analysis_id=req.analysis_id,
                           author_id=user.id, body=body.strip())
    db.add(note)
    db.commit()
    return {"id": note.id, "body": note.body, "author": user.full_name,
            "created_at": note.created_at.isoformat() if note.created_at else None}
