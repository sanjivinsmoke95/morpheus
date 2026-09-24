"""Procurement export package (mission Phase 20).

A structured, machine-readable JSON package of everything the analysis produced —
tender identity, product profile, requirements, applicable standards (with why),
coverage matrix, gaps, conflicts, QCO/certification, GFR flags, officer decisions
and review status — plus provenance on every standard record.

This is a *GeM / CPPP integration-ready export*, not a live integration. The PDF
compliance annex is the existing audit report (POST /reports).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models import (
    Analysis, Conflict, CoverageResult, Document, Gap, QcoRecord, Recommendation,
    Requirement, RequirementAttribute, Standard, User,
)

router = APIRouter(tags=["export"])


@router.get("/analyses/{analysis_id}/export")
def export_package(analysis_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> JSONResponse:
    a = db.get(Analysis, analysis_id)
    if not a:
        return JSONResponse({"error": "not found"}, status_code=404)
    doc = db.get(Document, a.document_id)
    std_by_id = {s.id: s for s in db.execute(select(Standard)).scalars()}
    reqs = db.execute(select(Requirement).where(Requirement.analysis_id == analysis_id)
                      .order_by(Requirement.req_code)).scalars().all()
    recs = db.execute(select(Recommendation).where(
        Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)).scalars().all()  # noqa: E712
    recs_by_req: dict[str, list[Recommendation]] = {}
    for r in recs:
        recs_by_req.setdefault(r.requirement_id, []).append(r)

    from app.services.classification.explain import build_why

    def req_json(req: Requirement) -> dict:
        attrs = db.execute(select(RequirementAttribute).where(
            RequirementAttribute.requirement_id == req.id)).scalars().all()
        stds = []
        for rec in sorted(recs_by_req.get(req.id, []), key=lambda x: x.final_rank):
            s = std_by_id.get(rec.standard_id)
            if not s:
                continue
            stds.append({
                "is_number": s.is_number, "title": s.title,
                "applicability": rec.applicability_class, "relevance": rec.relevance,
                "match_pct": round(rec.relevance_score * 100),
                "retrieval_method": rec.retrieval_method, "review_status": rec.review_status,
                "why": [w["factor"] for w in build_why(rec.signals_json, rec.applicability_class, rec.relevance)],
                "provenance": _provenance(s),
            })
        return {
            "req_code": req.req_code, "type": req.requirement_type, "description": req.description,
            "source_page": req.source_page, "confidence": req.confidence,
            "parameters": [{"key": x.key, "value": x.raw_value, "unit": x.unit,
                            "normalized": x.normalized_value, "canonical_unit": x.canonical_unit,
                            "comparator": x.comparator} for x in attrs],
            "applicable_standards": stds,
        }

    coverage = [{"requirement": c.requirement_id, "standard": std_by_id[c.standard_id].is_number
                 if c.standard_id in std_by_id else None, "coverage": c.coverage}
                for c in db.execute(select(CoverageResult).where(CoverageResult.analysis_id == analysis_id)).scalars()]
    conflicts = [{"parameter": c.parameter, "value_a": c.value_a, "unit_a": c.unit_a,
                  "value_b": c.value_b, "unit_b": c.unit_b, "severity": c.severity,
                  "explanation": c.explanation}
                 for c in db.execute(select(Conflict).where(Conflict.analysis_id == analysis_id)).scalars()]
    gaps = [{"type": g.gap_type, "description": g.description, "severity": g.severity,
             "mandatory_claim": g.is_mandatory_claim}
            for g in db.execute(select(Gap).where(Gap.analysis_id == analysis_id)).scalars()]

    rec_ids = [r.standard_id for r in recs]
    qco = [{"is_number": std_by_id[q.standard_id].is_number if q.standard_id in std_by_id else None,
            "status": q.qco_status, "order": q.order_name, "provenance": q.data_origin}
           for q in db.execute(select(QcoRecord).where(QcoRecord.standard_id.in_(rec_ids))).scalars()] if rec_ids else []

    from app.services.audit.gfr import gfr_review

    package = {
        "export_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "integration": "GeM / CPPP integration-ready export (not a live integration)",
        "tender": {
            "title": a.title, "document": doc.filename if doc else None,
            "sector": a.sector, "pages": doc.page_count if doc else None,
            "workflow_status": a.workflow_status,
        },
        "product_profile": a.product_profile_json or {},
        "languages": a.languages_json or [],
        "decision_trace": a.decision_trace_json or [],
        "requirements": [req_json(r) for r in reqs],
        "coverage_matrix": coverage,
        "conflicts": conflicts,
        "gaps": gaps,
        "qco_certification": qco,
        "gfr_review": gfr_review(db, analysis_id),
        "provenance_legend": {
            "DEMO_SYNTHETIC": "Illustrative demo record, not official BIS data",
            "PUBLIC_METADATA": "Public standard metadata (number/title/sector), no copyrighted text",
            "VERIFIED_RECORD": "Human-verified authoritative record",
        },
        "disclaimer": "AI-assisted findings for officer verification. Regulatory status shown only from "
                      "stored records or abstained. Not a live GeM/CPPP integration.",
    }
    headers = {"Content-Disposition": f'attachment; filename="morpheus-procurement-package-{analysis_id[:8]}.json"'}
    return JSONResponse(package, headers=headers)


def _provenance(s: Standard) -> str:
    return s.data_origin or "DEMO_SYNTHETIC"
