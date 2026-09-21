"""Phase 6 services: historical comparison, specification copilot, HS classification."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Analysis, Document, Gap, HistoricalTender, Recommendation, Requirement, Standard,
)

# ---- HS classification (demo mapping; NOT a customs authority) -------------
_HS_MAP = [
    (["pump", "centrifugal"], "8413", "Pumps for liquids"),
    (["motor", "induction"], "8501", "Electric motors and generators"),
    (["pipe", "pvc"], "3917", "Tubes, pipes of plastics"),
    (["cast iron", "casting"], "7325", "Other cast articles of iron or steel"),
    (["steel"], "7208", "Flat-rolled products of iron or non-alloy steel"),
    (["concrete", "cement"], "3824", "Prepared binders; chemical products"),
    (["appliance"], "8516", "Electric heating/household appliances"),
]


def classify_hs(text: str) -> list[dict]:
    low = (text or "").lower()
    out = []
    for keys, code, desc in _HS_MAP:
        if any(k in low for k in keys):
            out.append({"hs_code": code, "description": desc,
                        "matched_terms": [k for k in keys if k in low], "data_origin": "DEMO_SYNTHETIC"})
    return out


# ---- Historical comparison -------------------------------------------------
def store_as_historical(db: Session, analysis: Analysis) -> None:
    """Snapshot a completed analysis so future tenders can be compared to it."""
    existing = db.execute(select(HistoricalTender).where(
        HistoricalTender.source_analysis_id == analysis.id)).scalar_one_or_none()
    if existing:
        return
    doc = db.get(Document, analysis.document_id)
    std_numbers = _recommended_numbers(db, analysis.id)
    first_req = db.execute(select(Requirement).where(Requirement.analysis_id == analysis.id)
                           .order_by(Requirement.req_code)).scalars().first()
    db.add(HistoricalTender(
        title=analysis.title or (doc.filename if doc else "tender"),
        product_summary=(first_req.description if first_req else "")[:300],
        sector=analysis.sector, standards_used=std_numbers, source_analysis_id=analysis.id,
        data_origin="CURATED",
    ))
    db.flush()


def compare_to_history(db: Session, analysis: Analysis) -> dict:
    current = set(_recommended_numbers(db, analysis.id))
    history = db.execute(select(HistoricalTender).where(
        HistoricalTender.source_analysis_id != analysis.id)).scalars().all()
    similar = []
    all_prev: set[str] = set()
    for h in history:
        prev = set(h.standards_used or [])
        all_prev |= prev
        overlap = current & prev
        if overlap or (h.sector and h.sector == analysis.sector):
            similar.append({"title": h.title, "sector": h.sector, "standards_used": sorted(prev),
                            "overlap": sorted(overlap), "overlap_count": len(overlap)})
    similar.sort(key=lambda s: s["overlap_count"], reverse=True)
    return {
        "similar": similar[:5],
        "standards_previously_used": sorted(all_prev),
        "newly_appearing": sorted(current - all_prev),          # in this tender, not seen before
        "potentially_missing": sorted(all_prev - current) if all_prev else [],  # used before, not here
    }


# ---- Specification copilot (draft-only) ------------------------------------
_DRAFT_LABEL = "AI-GENERATED DRAFT — REQUIRES OFFICER REVIEW"


def copilot_drafts(db: Session, analysis: Analysis) -> list[dict]:
    """Draft requirement suggestions derived from detected gaps + applicable
    standards. Always labelled as drafts; linked to a supporting standard.
    Never modifies the tender."""
    gaps = db.execute(select(Gap).where(Gap.analysis_id == analysis.id)).scalars().all()
    drafts = []
    for g in gaps:
        std = db.get(Standard, g.related_standard_id) if g.related_standard_id else None
        category = g.gap_type.replace("missing_", "")
        draft_text = f"The tender should specify a {category} requirement"
        if std:
            draft_text += f" consistent with {std.is_number}"
        draft_text += "."
        drafts.append({
            "label": _DRAFT_LABEL,
            "draft_text": draft_text,
            "rationale": g.description,
            "supporting_standard": std.is_number if std else None,
            "supporting_standard_id": std.id if std else None,
            "gap_id": g.id,
        })
    return drafts


def _recommended_numbers(db: Session, analysis_id: str) -> list[str]:
    ids = set(db.execute(select(Recommendation.standard_id).where(
        Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)).scalars())  # noqa: E712
    if not ids:
        return []
    return sorted({s.is_number for s in db.execute(select(Standard).where(Standard.id.in_(ids))).scalars()})
