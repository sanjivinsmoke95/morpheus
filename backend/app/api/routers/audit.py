"""Audit findings surfaced on read. Phase 3: version intelligence."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sqlalchemy import select

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Conflict, CoverageResult, Evidence, Gap, Standard, User
from app.services.audit.readiness import readiness
from app.services.audit.versions import version_findings

router = APIRouter(tags=["audit"])


@router.get("/analyses/{analysis_id}/versions")
def versions(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return version_findings(db, analysis_id)


@router.get("/analyses/{analysis_id}/conflicts")
def conflicts(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    rows = db.execute(select(Conflict).where(Conflict.analysis_id == analysis_id)).scalars().all()
    return [{"id": c.id, "conflict_type": c.conflict_type, "parameter": c.parameter,
             "value_a": c.value_a, "unit_a": c.unit_a, "source_a": c.source_a,
             "value_b": c.value_b, "unit_b": c.unit_b, "source_b": c.source_b,
             "severity": c.severity, "explanation": c.explanation, "status": c.status} for c in rows]


@router.get("/analyses/{analysis_id}/gaps")
def gaps(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    rows = db.execute(select(Gap).where(Gap.analysis_id == analysis_id)).scalars().all()
    out = []
    for g in rows:
        std = db.get(Standard, g.related_standard_id) if g.related_standard_id else None
        ev = db.get(Evidence, g.evidence_id) if g.evidence_id else None
        out.append({"id": g.id, "gap_type": g.gap_type, "description": g.description,
                    "severity": g.severity, "is_mandatory_claim": g.is_mandatory_claim,
                    "related_standard": std.is_number if std else None, "status": g.status,
                    "evidence": ev.text if ev else None})
    return out


@router.get("/analyses/{analysis_id}/coverage")
def coverage(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    from app.models import Requirement
    rows = db.execute(select(CoverageResult).where(CoverageResult.analysis_id == analysis_id)).scalars().all()
    out = []
    for c in rows:
        req = db.get(Requirement, c.requirement_id) if c.requirement_id else None
        std = db.get(Standard, c.standard_id) if c.standard_id else None
        out.append({"id": c.id, "requirement_code": req.req_code if req else None,
                    "requirement": req.description if req else None,
                    "standard": std.is_number if std else None, "coverage": c.coverage,
                    "explanation": c.explanation, "status": c.status})
    return out


@router.get("/analyses/{analysis_id}/readiness")
def analysis_readiness(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    return readiness(db, analysis_id)
