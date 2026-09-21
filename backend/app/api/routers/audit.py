"""Audit findings surfaced on read. Phase 3: version intelligence."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import User
from app.services.audit.versions import version_findings

router = APIRouter(tags=["audit"])


@router.get("/analyses/{analysis_id}/versions")
def versions(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return version_findings(db, analysis_id)
