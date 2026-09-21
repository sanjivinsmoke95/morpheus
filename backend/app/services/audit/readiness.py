"""Procurement readiness scorecard (spec §19): aggregates the audit outputs."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Conflict, CoverageResult, Gap, Recommendation
from app.services.audit.versions import version_findings


def readiness(db: Session, analysis_id: str) -> dict:
    def count(model, *where):
        return db.execute(select(func.count()).select_from(model).where(*where)).scalar_one()

    standards = db.execute(select(func.count(func.distinct(Recommendation.standard_id))).where(
        Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)).scalar_one()  # noqa: E712

    covs = db.execute(select(CoverageResult.coverage).where(CoverageResult.analysis_id == analysis_id)).scalars().all()
    full = sum(1 for c in covs if c == "FULL")
    partial = sum(1 for c in covs if c == "PARTIAL")
    missing = sum(1 for c in covs if c == "MISSING")

    conflicts = count(Conflict, Conflict.analysis_id == analysis_id)
    gaps = count(Gap, Gap.analysis_id == analysis_id)
    pending = count(Recommendation, Recommendation.analysis_id == analysis_id,
                    Recommendation.excluded == False, Recommendation.review_status == "PENDING")  # noqa: E712

    versions = version_findings(db, analysis_id)
    outdated = sum(1 for v in versions if v["discrepancy_type"] in ("OUTDATED", "SUPERSEDED"))
    unresolved = sum(1 for v in versions if v["discrepancy_type"] == "UNKNOWN")

    return {
        "standards_identified": standards,
        "requirements_total": len(covs),
        "requirements_covered": full,
        "requirements_partial": partial,
        "requirements_missing": missing,
        "conflicts": conflicts,
        "gaps": gaps,
        "outdated_references": outdated,
        "unresolved_references": unresolved,
        "pending_review_items": pending + conflicts + gaps,
    }
