"""Version intelligence (spec §9): check standards referenced in the tender against
current versions and supersession. Deterministic; abstains (UNKNOWN/REVIEW_REQUIRED)
when data is insufficient — never fabricates a version.
"""

from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Requirement, RequirementAttribute, Standard, StandardRelationship,
)
from app.services.standards.util import normalize_is_number

_YEAR = re.compile(r"IS\s*\d{2,5}\s*[:\-]\s*(\d{4})", re.IGNORECASE)


def version_findings(db: Session, analysis_id: str) -> list[dict]:
    reqs = db.execute(select(Requirement).where(
        Requirement.analysis_id == analysis_id,
        Requirement.requirement_type == "REFERENCED_STANDARD")).scalars().all()
    if not reqs:
        return []
    standards = list(db.execute(select(Standard)).scalars())
    by_norm = {s.is_number_normalized: s for s in standards}
    superseded = {r.from_standard_id for r in db.execute(
        select(StandardRelationship).where(StandardRelationship.relationship_type == "SUPERSEDED_BY")).scalars()}

    out: list[dict] = []
    for req in reqs:
        attrs = db.execute(select(RequirementAttribute).where(
            RequirementAttribute.requirement_id == req.id,
            RequirementAttribute.key == "referenced_standard")).scalars().all()
        for a in attrs:
            norm = normalize_is_number(a.raw_value)
            std = by_norm.get(norm)
            # The full reference (with year) lives on the attribute; the requirement
            # description may be truncated at the colon by sentence splitting.
            ref_year_m = _YEAR.search(a.raw_value) or _YEAR.search(req.description)
            ref_year = ref_year_m.group(1) if ref_year_m else None

            if not std:
                out.append(_finding(a.raw_value, None, ref_year, None, "UNKNOWN", "REVIEW_REQUIRED",
                                    req, "Referenced standard is not in the database — verify manually."))
                continue
            current = std.current_version or None
            if std.id in superseded:
                disc, conf, note = "SUPERSEDED", "HIGH", "A superseding standard exists in the database."
            elif ref_year and current and ref_year != current:
                disc, conf, note = "OUTDATED", "HIGH", f"Tender cites {ref_year}; current version is {current}."
            elif ref_year and current and ref_year == current:
                disc, conf, note = "OK", "HIGH", "Referenced version matches the current version."
            else:
                disc, conf, note = "UNKNOWN", "MEDIUM", "Version could not be confirmed from available data."
            out.append(_finding(a.raw_value, std, ref_year, current, disc, conf, req, note))
    return out


def _finding(referenced_text, std, ref_year, current, discrepancy, confidence, req, note) -> dict:
    return {
        "referenced_text": referenced_text,
        "standard_id": std.id if std else None,
        "is_number": std.is_number if std else None,
        "referenced_version": ref_year,
        "current_version": current,
        "discrepancy_type": discrepancy,   # OK | OUTDATED | SUPERSEDED | UNKNOWN
        "confidence": confidence,
        "note": note,
        "evidence": {"source_type": "tender_document", "page": req.source_page,
                     "section": req.source_section, "text": req.description},
    }
