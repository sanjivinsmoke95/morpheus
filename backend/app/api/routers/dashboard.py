"""Dashboard KPIs + department analytics.

Aggregates existing analysis / coverage / gap / recommendation data into the
officer landing dashboard and the cross-tender analytics view. No new models —
everything is derived on read from persisted results.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import (
    Analysis, CoverageResult, Document, Gap, Recommendation, Requirement, Standard, User,
)
from app.models.enums import AnalysisStatus

router = APIRouter(tags=["dashboard"])


def _verdict_for(db: Session, analysis_id: str) -> dict:
    """Cheap per-analysis verdict from coverage + conflicts + gaps."""
    covs = db.execute(
        select(CoverageResult.coverage).where(CoverageResult.analysis_id == analysis_id)
    ).scalars().all()
    total = len(covs)
    full = sum(1 for c in covs if c == "FULL")
    partial = sum(1 for c in covs if c == "PARTIAL")
    missing = sum(1 for c in covs if c == "MISSING")
    gaps = db.execute(
        select(func.count()).select_from(Gap).where(Gap.analysis_id == analysis_id)
    ).scalar_one()
    from app.models import Conflict
    conflicts = db.execute(
        select(func.count()).select_from(Conflict).where(Conflict.analysis_id == analysis_id)
    ).scalar_one()

    if missing > 0 or conflicts > 0:
        verdict, tone = "ACTION_REQUIRED", "danger"
    elif partial > 0 or gaps > 0:
        verdict, tone = "REVIEW", "warning"
    elif total > 0:
        verdict, tone = "READY", "success"
    else:
        verdict, tone = "PENDING", "neutral"

    compliance_pct = round(100 * full / total) if total else 0
    return {
        "verdict": verdict, "tone": tone, "compliance_pct": compliance_pct,
        "requirements_total": total, "covered": full, "partial": partial,
        "missing": missing, "gaps": gaps, "conflicts": conflicts,
    }


@router.get("/dashboard/summary")
def dashboard_summary(
    limit: int = Query(default=8, le=25),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    analyses = db.execute(select(Analysis).order_by(Analysis.created_at.desc())).scalars().all()
    completed = [a for a in analyses if a.status == AnalysisStatus.READY.value]

    verdicts = {a.id: _verdict_for(db, a.id) for a in completed}
    needs_action = sum(1 for v in verdicts.values() if v["verdict"] == "ACTION_REQUIRED")
    compliance_vals = [v["compliance_pct"] for v in verdicts.values() if v["requirements_total"] > 0]
    gap_vals = [v["gaps"] for v in verdicts.values()]

    docs = {d.id: d for d in db.execute(select(Document)).scalars()}
    recent = []
    for a in analyses[:limit]:
        v = verdicts.get(a.id)
        recent.append({
            "id": a.id, "title": a.title or (docs.get(a.document_id).filename if docs.get(a.document_id) else "Untitled"),
            "sector": a.sector or "—", "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "verdict": v["verdict"] if v else "PENDING",
            "tone": v["tone"] if v else "neutral",
            "compliance_pct": v["compliance_pct"] if v else None,
        })

    return {
        "kpis": {
            "active_tenders": len(analyses),
            "compliance_rate": round(sum(compliance_vals) / len(compliance_vals)) if compliance_vals else 0,
            "needs_action": needs_action,
            "avg_gaps": round(sum(gap_vals) / len(gap_vals), 1) if gap_vals else 0,
        },
        "recent": recent,
    }


@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    analyses = db.execute(select(Analysis).order_by(Analysis.created_at.desc())).scalars().all()
    completed = [a for a in analyses if a.status == AnalysisStatus.READY.value]
    verdicts = {a.id: _verdict_for(db, a.id) for a in completed}

    compliance_vals = [v["compliance_pct"] for v in verdicts.values() if v["requirements_total"] > 0]
    gap_vals = [v["gaps"] for v in verdicts.values()]

    # Sector breakdown
    sector_counter: Counter[str] = Counter()
    sector_compliance: dict[str, list[int]] = {}
    for a in completed:
        sec = a.sector or "unspecified"
        sector_counter[sec] += 1
        sector_compliance.setdefault(sec, []).append(verdicts[a.id]["compliance_pct"])
    sector_breakdown = [
        {"sector": sec, "count": cnt,
         "compliance_rate": round(sum(sector_compliance[sec]) / len(sector_compliance[sec]))
         if sector_compliance.get(sec) else 0}
        for sec, cnt in sector_counter.most_common()
    ]

    # Top gap categories (by requirement type of gap-affected reqs; fallback to gap_type)
    gap_type_counter: Counter[str] = Counter()
    for a in completed:
        for g in db.execute(select(Gap).where(Gap.analysis_id == a.id)).scalars():
            gap_type_counter[g.gap_type or "OTHER"] += 1
    gap_categories = [{"category": k, "gap_count": v} for k, v in gap_type_counter.most_common(6)]

    # Most-cited standards across all analyses
    std_counter: Counter[str] = Counter(
        db.execute(
            select(Recommendation.standard_id).where(Recommendation.excluded == False)  # noqa: E712
        ).scalars()
    )
    std_by_id = {s.id: s for s in db.execute(select(Standard)).scalars()}
    top_standards = [
        {"is_number": std_by_id[sid].is_number, "title": std_by_id[sid].title, "citation_count": cnt}
        for sid, cnt in std_counter.most_common(8) if sid in std_by_id
    ]

    # Weekly trend (last 8 weeks)
    now = datetime.now(timezone.utc)
    trend = []
    for w in range(7, -1, -1):
        start = now - timedelta(weeks=w + 1)
        end = now - timedelta(weeks=w)
        wk = [a for a in completed if a.created_at and start < _aware(a.created_at) <= end]
        wk_comp = [verdicts[a.id]["compliance_pct"] for a in wk if verdicts[a.id]["requirements_total"] > 0]
        trend.append({
            "week": end.strftime("%d %b"),
            "analyses_count": len(wk),
            "compliance_rate": round(sum(wk_comp) / len(wk_comp)) if wk_comp else 0,
        })

    return {
        "kpis": {
            "total_analyses": len(completed),
            "compliance_rate": round(sum(compliance_vals) / len(compliance_vals)) if compliance_vals else 0,
            "avg_gaps": round(sum(gap_vals) / len(gap_vals), 1) if gap_vals else 0,
            "standards_catalogue": db.execute(select(func.count()).select_from(Standard)).scalar_one(),
        },
        "sector_breakdown": sector_breakdown,
        "gap_categories": gap_categories,
        "top_standards": top_standards,
        "trend": trend,
    }


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
