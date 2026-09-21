"""Analyses: create (schedules the pipeline), list, get, rerun."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Analysis, Document, User
from app.models.enums import AnalysisStatus
from app.schemas.slice import AnalysisCreate, AnalysisRead
from app.services.orchestrator.pipeline import run_pipeline

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.post("", response_model=AnalysisRead, status_code=status.HTTP_201_CREATED)
def create_analysis(
    payload: AnalysisCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Analysis:
    if not db.get(Document, payload.document_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    analysis = Analysis(
        document_id=payload.document_id, created_by=user.id, title=payload.title,
        sector=payload.sector, status=AnalysisStatus.QUEUED.value,
    )
    db.add(analysis)
    db.commit()
    background.add_task(run_pipeline, analysis.id)  # runs after the response is sent
    return analysis


@router.get("", response_model=list[AnalysisRead])
def list_analyses(
    mine: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Analysis]:
    stmt = select(Analysis).order_by(Analysis.created_at.desc())
    if mine:
        stmt = stmt.where(Analysis.created_by == user.id)
    return list(db.execute(stmt).scalars())


@router.get("/{analysis_id}", response_model=AnalysisRead)
def get_analysis(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Analysis:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    return analysis


@router.post("/{analysis_id}/rerun", response_model=AnalysisRead)
def rerun(
    analysis_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Analysis:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    analysis.status = AnalysisStatus.QUEUED.value
    db.commit()
    background.add_task(run_pipeline, analysis_id)
    return analysis
