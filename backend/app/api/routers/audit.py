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


@router.get("/analyses/{analysis_id}/coverage-by-category")
def coverage_by_category(analysis_id: str, db: Session = Depends(get_db),
                         _: User = Depends(get_current_user)) -> list[dict]:
    """Coverage grouped by requirement type, for the Overview category bars."""
    from app.models import Requirement
    reqs = {r.id: r for r in db.execute(
        select(Requirement).where(Requirement.analysis_id == analysis_id)).scalars()}
    covs = db.execute(select(CoverageResult).where(CoverageResult.analysis_id == analysis_id)).scalars().all()
    buckets: dict[str, dict] = {}
    for c in covs:
        req = reqs.get(c.requirement_id)
        cat = (req.requirement_type if req else "OTHER") or "OTHER"
        b = buckets.setdefault(cat, {"category": cat, "full": 0, "partial": 0, "missing": 0, "total": 0})
        if c.coverage == "FULL":
            b["full"] += 1
        elif c.coverage == "PARTIAL":
            b["partial"] += 1
        elif c.coverage == "MISSING":
            b["missing"] += 1
        b["total"] += 1
    return sorted(buckets.values(), key=lambda x: x["total"], reverse=True)


@router.get("/analyses/{analysis_id}/issues")
def issues(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    """Unified, severity-sorted feed of conflicts + gaps + outdated version references."""
    from app.models import Requirement
    reqs = {r.id: r for r in db.execute(
        select(Requirement).where(Requirement.analysis_id == analysis_id)).scalars()}
    out: list[dict] = []

    for c in db.execute(select(Conflict).where(Conflict.analysis_id == analysis_id)).scalars():
        out.append({
            "id": c.id, "type": "CONFLICT",
            "severity": (c.severity or "HIGH").upper(),
            "title": f"Conflicting values for {c.parameter or 'a parameter'}",
            "description": c.explanation or
            f"{c.value_a}{c.unit_a or ''} ({c.source_a}) vs {c.value_b}{c.unit_b or ''} ({c.source_b}).",
            "standard_is_number": None,
            "recommended_action": "Confirm the correct value with the technical department before tendering.",
        })

    for g in db.execute(select(Gap).where(Gap.analysis_id == analysis_id)).scalars():
        std = db.get(Standard, g.related_standard_id) if g.related_standard_id else None
        out.append({
            "id": g.id, "type": "GAP",
            "severity": "HIGH" if g.is_mandatory_claim else (g.severity or "MEDIUM").upper(),
            "title": g.description,
            "description": (f"Related standard: {std.is_number}. " if std else "") +
            "A potentially applicable standard may be missing from the specification.",
            "standard_is_number": std.is_number if std else None,
            "recommended_action": "Verify whether this standard should be added to the tender.",
        })

    for v in version_findings(db, analysis_id):
        if v["discrepancy_type"] in ("OUTDATED", "SUPERSEDED"):
            out.append({
                "id": v.get("standard_id") or v.get("is_number") or "version",
                "type": "OUTDATED",
                "severity": "MEDIUM",
                "title": f"Outdated reference to {v.get('is_number') or 'a standard'}",
                "description": v.get("note") or
                f"Referenced {v.get('referenced_version') or 'an older edition'}; "
                f"current is {v.get('current_version') or 'a newer edition'}.",
                "standard_is_number": v.get("is_number"),
                "recommended_action": f"Update the reference to the current edition"
                + (f" ({v['current_version']})." if v.get("current_version") else "."),
            })

    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    out.sort(key=lambda x: order.get(x["severity"], 4))
    return out
