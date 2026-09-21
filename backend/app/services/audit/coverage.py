"""Coverage + gap detection (spec §7, §10, §16).

Coverage: per requirement, is there a standard that applies? (FULL/PARTIAL/MISSING).
Gaps: completeness checks for categories a procurement spec usually addresses
(testing/safety/certification/installation), strengthened when a directly-applicable
standard engages that category via a typed relationship. Gaps are POTENTIAL and
never claimed mandatory without authoritative evidence.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    CoverageResult, Evidence, Gap, Recommendation, Requirement, Standard, StandardRelationship,
)

_STRONG = {"DIRECTLY_APPLICABLE", "NORMATIVE_REFERENCE"}
# Categories a complete spec usually addresses → requirement types that satisfy them.
_COMPLETENESS = {
    "TESTING": "missing_testing",
    "SAFETY": "missing_safety",
    "CERTIFICATION": "missing_certification",
    "INSTALLATION": "missing_installation",
}
_REL_FOR_CATEGORY = {"TESTING": "TESTING", "SAFETY": "SAFETY", "INSTALLATION": "INSTALLATION"}


def run_coverage_and_gaps(db: Session, analysis_id: str) -> tuple[int, int]:
    db.execute(delete(CoverageResult).where(CoverageResult.analysis_id == analysis_id))
    db.execute(delete(Gap).where(Gap.analysis_id == analysis_id))
    db.flush()

    reqs = db.execute(select(Requirement).where(Requirement.analysis_id == analysis_id)).scalars().all()
    recs = db.execute(select(Recommendation).where(
        Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)).scalars().all()  # noqa: E712
    recs_by_req: dict[str, list[Recommendation]] = {}
    for r in recs:
        recs_by_req.setdefault(r.requirement_id, []).append(r)

    # --- per-requirement coverage ---
    cov = 0
    for req in reqs:
        rlist = recs_by_req.get(req.id, [])
        if any(r.applicability_class in _STRONG for r in rlist):
            coverage, expl = "FULL", "A directly-applicable standard covers this requirement."
        elif rlist:
            coverage, expl = "PARTIAL", "Only related/weaker standards were matched."
        else:
            coverage, expl = "MISSING", "No applicable standard was matched for this requirement."
        best = rlist[0].standard_id if rlist else None
        db.add(CoverageResult(analysis_id=analysis_id, requirement_id=req.id, standard_id=best,
                              coverage=coverage, explanation=expl, status="PENDING"))
        cov += 1

    # --- completeness gaps ---
    present_types = {req.requirement_type for req in reqs}
    directly = [db.get(Standard, r.standard_id) for r in recs if r.applicability_class == "DIRECTLY_APPLICABLE"]
    directly = [s for s in directly if s]
    now = datetime.now(timezone.utc).isoformat()
    gaps = 0
    for category, gap_type in _COMPLETENESS.items():
        if category in present_types:
            continue  # tender addresses this category
        rel_type = _REL_FOR_CATEGORY.get(category)
        grounded = _standard_engaging(db, directly, rel_type) if rel_type else None
        ev = None
        if grounded:
            ev = Evidence(source_type="standard_relationship", source_name="DEMO",
                          text=f"{grounded.is_number} engages {category.lower()} via a typed relationship, "
                               f"but the tender specifies no {category.lower()} requirement.",
                          retrieved_at=now, data_origin=grounded.data_origin)
            db.add(ev)
            db.flush()
        db.add(Gap(
            analysis_id=analysis_id, gap_type=gap_type,
            description=f"No explicit {category.lower()} requirement found in the tender"
                        + (f" (applicable standard {grounded.is_number} engages it)." if grounded else "."),
            related_standard_id=grounded.id if grounded else None,
            severity="medium" if grounded else "low", is_mandatory_claim=False,
            evidence_id=ev.id if ev else None, status="POTENTIAL",
        ))
        gaps += 1
    db.flush()
    return cov, gaps


def _standard_engaging(db: Session, standards, rel_type: str) -> Standard | None:
    ids = [s.id for s in standards]
    if not ids or not rel_type:
        return None
    rel = db.execute(select(StandardRelationship).where(
        StandardRelationship.from_standard_id.in_(ids),
        StandardRelationship.relationship_type == rel_type)).scalars().first()
    return db.get(Standard, rel.from_standard_id) if rel else None
