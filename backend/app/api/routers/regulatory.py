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
    Analysis, CertificationRecord, Document, QcoRecord, Recommendation, Standard, StandardAmendment, User,
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
    out = [{"is_number": std.get(q.standard_id).is_number if std.get(q.standard_id) else None,
            "qco_status": q.qco_status, "product_description": q.product_description,
            "order_name": q.order_name,
            "effective_date": q.effective_date.isoformat() if q.effective_date else None,
            "notes": q.notes, "source_name": q.source_name, "source_url": q.source_url,
            "retrieved_at": q.retrieved_at, "data_origin": q.data_origin} for q in rows]
    # Phase 15: standards with NO QCO record on file → explicit REVIEW_REQUIRED, never
    # silently assumed voluntary. Provenance is clear; status is never fabricated.
    with_record = {q.standard_id for q in rows}
    for sid in ids - with_record:
        s = std.get(sid)
        if s:
            out.append({"is_number": s.is_number, "qco_status": "REVIEW_REQUIRED",
                        "product_description": s.title, "order_name": "",
                        "effective_date": None, "notes": "No QCO record on file — verify with BIS.",
                        "source_name": "", "source_url": "", "retrieved_at": "",
                        "data_origin": "REVIEW_REQUIRED"})
    order = {"MANDATORY": 0, "VOLUNTARY": 1, "UNKNOWN": 2, "REVIEW_REQUIRED": 3}
    out.sort(key=lambda x: order.get(x["qco_status"], 4))
    return out


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


@router.get("/regulatory/updates")
def regulatory_updates(limit: int = 20, db: Session = Depends(get_db),
                       _: User = Depends(get_current_user)) -> list[dict]:
    """Global feed of recent amendments + QCO changes, newest first.

    Cross-tender: shows which of the officer's analyses cite each changed standard.
    """
    std_by_id = {s.id: s for s in db.execute(select(Standard)).scalars()}
    # Map standard_id -> set of analysis titles that cite it
    cite_rows = db.execute(
        select(Recommendation.standard_id, Analysis.id, Analysis.title, Document.filename)
        .join(Analysis, Analysis.id == Recommendation.analysis_id)
        .join(Document, Document.id == Analysis.document_id)
        .where(Recommendation.excluded == False)  # noqa: E712
    ).all()
    cites: dict[str, list[dict]] = {}
    for sid, aid, title, fname in cite_rows:
        cites.setdefault(sid, [])
        if not any(c["id"] == aid for c in cites[sid]):
            cites[sid].append({"id": aid, "title": title or fname})

    items: list[dict] = []
    for a in db.execute(select(StandardAmendment)).scalars():
        s = std_by_id.get(a.standard_id)
        if not s:
            continue
        items.append({
            "type": "AMENDMENT",
            "is_number": s.is_number, "title": s.title,
            "headline": f"{a.amendment_no} to {s.is_number}",
            "detail": a.summary or f"Affects {', '.join(a.affected_clauses) or 'unspecified clauses'}.",
            "date": a.amendment_date.isoformat() if a.amendment_date else None,
            "affects_tenders": cites.get(s.id, []),
            "data_origin": a.data_origin,
        })
    for q in db.execute(select(QcoRecord).where(QcoRecord.qco_status == "MANDATORY")).scalars():
        s = std_by_id.get(q.standard_id)
        if not s:
            continue
        items.append({
            "type": "QCO",
            "is_number": s.is_number, "title": s.title,
            "headline": f"{s.is_number} is QCO-mandatory",
            "detail": q.order_name or "Mandatory certification order in force.",
            "date": q.effective_date.isoformat() if q.effective_date else None,
            "affects_tenders": cites.get(s.id, []),
            "data_origin": q.data_origin,
        })

    items.sort(key=lambda x: (x["date"] or ""), reverse=True)
    return items[:limit]
