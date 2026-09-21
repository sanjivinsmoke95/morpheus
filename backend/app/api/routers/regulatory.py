"""Regulatory intelligence (Phase 5): QCO + certification + amendment impact.

Regulatory status comes ONLY from stored records (with provenance); the app never
invents it. Amendment impact is surfaced for human review, not legally interpreted.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import (
    CertificationRecord, QcoRecord, Recommendation, Standard, StandardAmendment, User,
)

router = APIRouter(tags=["regulatory"])


def _recommended_standard_ids(db: Session, analysis_id: str) -> set[str]:
    return set(db.execute(select(Recommendation.standard_id).where(
        Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)).scalars())  # noqa: E712


@router.get("/analyses/{analysis_id}/qco")
def qco(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    ids = _recommended_standard_ids(db, analysis_id)
    if not ids:
        return []
    rows = db.execute(select(QcoRecord).where(QcoRecord.standard_id.in_(ids))).scalars().all()
    std = {s.id: s for s in db.execute(select(Standard).where(Standard.id.in_(ids))).scalars()}
    return [{"is_number": std.get(q.standard_id).is_number if std.get(q.standard_id) else None,
             "qco_status": q.qco_status, "product_description": q.product_description,
             "order_name": q.order_name,
             "effective_date": q.effective_date.isoformat() if q.effective_date else None,
             "notes": q.notes, "source_name": q.source_name, "source_url": q.source_url,
             "retrieved_at": q.retrieved_at, "data_origin": q.data_origin} for q in rows]


@router.get("/analyses/{analysis_id}/certification")
def certification(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    ids = _recommended_standard_ids(db, analysis_id)
    if not ids:
        return []
    rows = db.execute(select(CertificationRecord).where(CertificationRecord.standard_id.in_(ids))).scalars().all()
    std = {s.id: s for s in db.execute(select(Standard).where(Standard.id.in_(ids))).scalars()}
    return [{"is_number": std.get(c.standard_id).is_number if std.get(c.standard_id) else None,
             "scheme": c.scheme, "product_description": c.product_description, "requirement": c.requirement,
             "effective_date": c.effective_date.isoformat() if c.effective_date else None,
             "source_name": c.source_name, "data_origin": c.data_origin} for c in rows]


@router.get("/analyses/{analysis_id}/amendments")
def amendment_impact(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    # Only for standards that are directly applicable in this analysis.
    direct_ids = set(db.execute(select(Recommendation.standard_id).where(
        Recommendation.analysis_id == analysis_id,
        Recommendation.applicability_class == "DIRECTLY_APPLICABLE")).scalars())
    if not direct_ids:
        return []
    amendments = db.execute(select(StandardAmendment).where(
        StandardAmendment.standard_id.in_(direct_ids))).scalars().all()
    std = {s.id: s for s in db.execute(select(Standard).where(Standard.id.in_(direct_ids))).scalars()}
    out = []
    for a in amendments:
        s = std.get(a.standard_id)
        out.append({
            "is_number": s.is_number if s else None,
            "amendment_no": a.amendment_no,
            "amendment_date": a.amendment_date.isoformat() if a.amendment_date else None,
            "affected_clauses": a.affected_clauses,
            "summary": a.summary,
            # Surfaced for review — NOT a legal interpretation.
            "potential_impact": f"Amendment affects {', '.join(a.affected_clauses) or 'unspecified clauses'}; "
                                "review whether the tender requirements are affected.",
            "confidence": "REVIEW_REQUIRED",
            "data_origin": a.data_origin, "source_name": a.source_name,
        })
    return out
