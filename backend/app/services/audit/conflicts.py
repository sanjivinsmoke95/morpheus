"""Conflict detection (spec §8, §11): contradictory values for the same parameter,
compared in canonical units so 10 bar vs 1 MPa is NOT flagged but 230 V vs 415 V is.
Deterministic. Persists Conflict rows for human review.
"""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Conflict, Requirement, RequirementAttribute

# Parameters that should have a single consistent value across a spec.
_SINGLE_VALUED = {"voltage", "frequency", "pressure", "temperature", "current", "power"}
_TOL = 1e-3


def detect_conflicts(db: Session, analysis_id: str) -> list[Conflict]:
    db.execute(delete(Conflict).where(Conflict.analysis_id == analysis_id))
    db.flush()

    req_by_id = {r.id: r for r in db.execute(
        select(Requirement).where(Requirement.analysis_id == analysis_id)).scalars()}
    if not req_by_id:
        return []
    attrs = db.execute(select(RequirementAttribute).where(
        RequirementAttribute.requirement_id.in_(req_by_id.keys()))).scalars().all()

    # Group normalized values by canonical parameter key.
    grouped: dict[str, list[tuple[float, str, RequirementAttribute]]] = {}
    for a in attrs:
        if a.key in _SINGLE_VALUED and a.normalized_value is not None:
            grouped.setdefault(a.key, []).append((a.normalized_value, a.canonical_unit, a))

    made: list[Conflict] = []
    for key, values in grouped.items():
        distinct = _distinct(values)
        if len(distinct) < 2:
            continue
        # Report the two most divergent values as a conflict.
        distinct.sort(key=lambda t: t[0])
        lo, hi = distinct[0], distinct[-1]
        a_req = req_by_id.get(lo[2].requirement_id)
        b_req = req_by_id.get(hi[2].requirement_id)
        conflict = Conflict(
            analysis_id=analysis_id, conflict_type="TECHNICAL_PARAMETER", parameter=key,
            value_a=str(lo[2].raw_value), unit_a=lo[2].unit, source_a=_src(a_req),
            value_b=str(hi[2].raw_value), unit_b=hi[2].unit, source_b=_src(b_req),
            severity="high",
            explanation=f"{key} specified as {lo[2].raw_value} {lo[2].unit} and "
                        f"{hi[2].raw_value} {hi[2].unit} ({lo[1]} vs {hi[1]} normalized) in different places.",
            status="REVIEW_REQUIRED",
        )
        db.add(conflict)
        made.append(conflict)
    if made:
        db.flush()
    return made


def _distinct(values: list[tuple[float, str, RequirementAttribute]]) -> list[tuple[float, str, RequirementAttribute]]:
    out: list[tuple[float, str, RequirementAttribute]] = []
    for v in values:
        if not any(abs(v[0] - o[0]) <= _TOL * max(abs(v[0]), abs(o[0]), 1) and v[1] == o[1] for o in out):
            out.append(v)
    return out


def _src(req: Requirement | None) -> str:
    if not req:
        return "—"
    pg = f"pg {req.source_page}" if req.source_page else ""
    return f"{req.req_code} {pg}".strip()
