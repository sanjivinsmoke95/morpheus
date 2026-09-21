"""Analysis orchestrator (architecture.md §5).

Runs a document through the vertical-slice stages and persists everything with
traceability + evidence. Resumable/idempotent per requirement so an officer's
edit re-runs only the affected requirement (partial re-analysis).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import (
    Analysis, DocumentPage, Recommendation, RecommendationEvidence, Requirement, RequirementAttribute, Standard,
)
from app.models.enums import AnalysisStatus
from app.services.classification.rules import classify
from app.services.evidence import assemble
from app.services.extraction.service import run_extraction
from app.services.retrieval.engine import retrieve_for_requirement
from app.services.standards.util import normalize_is_number

logger = logging.getLogger(__name__)


@dataclass
class _ReqQuery:
    description: str
    attributes: list[dict] = field(default_factory=list)


def _set_status(db: Session, analysis: Analysis, status: AnalysisStatus, error: str | None = None) -> None:
    analysis.status = status.value
    analysis.stage_error = error
    db.commit()


def run_analysis(db: Session, analysis: Analysis) -> None:
    """Core pipeline over a given session (directly unit/E2E testable)."""
    try:
        _extract_requirements(db, analysis)
        _recommend_all(db, analysis)
        _audit(db, analysis)
        _set_status(db, analysis, AnalysisStatus.READY)
    except Exception as exc:  # noqa: BLE001 — record the failing stage, don't crash the worker
        logger.exception("pipeline failed for analysis %s", analysis.id)
        _set_status(db, analysis, AnalysisStatus.FAILED, error=str(exc)[:500])


def run_pipeline(analysis_id: str) -> None:
    """Background-worker entry point. Opens its own session."""
    with SessionLocal() as db:
        analysis = db.get(Analysis, analysis_id)
        if analysis:
            run_analysis(db, analysis)


def _extract_requirements(db: Session, analysis: Analysis) -> None:
    _set_status(db, analysis, AnalysisStatus.EXTRACTING_REQUIREMENTS)
    pages = db.execute(
        select(DocumentPage).where(DocumentPage.document_id == analysis.document_id).order_by(DocumentPage.page_number)
    ).scalars().all()
    # Clear any prior extraction (idempotent re-run).
    db.execute(delete(Requirement).where(Requirement.analysis_id == analysis.id))
    db.flush()

    reqs = run_extraction([(p.page_number, p.text) for p in pages])
    for r in reqs:
        req = Requirement(
            analysis_id=analysis.id, req_code=r["req_code"], requirement_type=r["requirement_type"],
            description=r["description"], source_page=r.get("source_page"),
            source_section=r.get("source_section", ""), confidence=r["confidence"],
            extraction_method=r.get("extraction_method", "rule"),
        )
        db.add(req)
        db.flush()
        for a in r.get("attributes", []):
            db.add(RequirementAttribute(
                requirement_id=req.id, key=a.get("key", "parameter"), raw_value=str(a.get("raw_value", "")),
                normalized_value=a.get("normalized_value"), unit=a.get("unit", ""),
                canonical_unit=a.get("canonical_unit", ""), comparator=a.get("comparator", "="),
                value_high=_to_float(a.get("value_high")), confidence=r["confidence"],
            ))
    db.commit()


def _recommend_all(db: Session, analysis: Analysis) -> None:
    _set_status(db, analysis, AnalysisStatus.RETRIEVING)
    reqs = db.execute(select(Requirement).where(Requirement.analysis_id == analysis.id)).scalars().all()
    for req in reqs:
        _recommend_for(db, analysis, req)
    _set_status(db, analysis, AnalysisStatus.CLASSIFYING)
    db.commit()


def _audit(db: Session, analysis: Analysis) -> None:
    _set_status(db, analysis, AnalysisStatus.AUDITING)
    from app.services.audit.conflicts import detect_conflicts
    from app.services.audit.coverage import run_coverage_and_gaps

    detect_conflicts(db, analysis.id)
    run_coverage_and_gaps(db, analysis.id)
    db.commit()


def _attrs_of(db: Session, requirement: Requirement) -> list[dict]:
    rows = db.execute(
        select(RequirementAttribute).where(RequirementAttribute.requirement_id == requirement.id)
    ).scalars().all()
    return [{"key": a.key, "unit": a.unit, "raw_value": a.raw_value} for a in rows]


def _recommend_for(db: Session, analysis: Analysis, requirement: Requirement) -> None:
    # Wipe old recommendations for this requirement (partial re-analysis).
    db.execute(delete(Recommendation).where(Recommendation.requirement_id == requirement.id))
    db.flush()

    query = _ReqQuery(description=requirement.description, attributes=_attrs_of(db, requirement))
    candidates = retrieve_for_requirement(db, query, analysis.sector, top_k=5)
    if not candidates:
        return

    # Referenced-standard match?
    referenced = _referenced_norms(query.attributes)
    best_included: Recommendation | None = None
    for rank, cand in enumerate(candidates, start=1):
        is_ref = cand.standard.is_number_normalized in referenced
        # Evidence first (so classification can honor "has_evidence").
        tender_ev = assemble.tender_evidence(db, requirement, analysis.document_id)
        std_ev = assemble.standard_evidence(db, cand.standard, cand.matched_chunk)
        cls = classify(requirement.requirement_type, cand.signals, cand.relevance,
                       is_referenced_match=is_ref, has_evidence=True)

        rec = Recommendation(
            analysis_id=analysis.id, requirement_id=requirement.id, standard_id=cand.standard.id,
            applicability_class=cls.applicability_class, relevance=cand.relevance,
            relevance_score=round(cand.score, 4), retrieval_method=cand.retrieval_method,
            signals_json={**cand.signals, "lexical": round(cand.lexical, 3), "semantic": round(cand.semantic, 3)},
            rationale=cls.rationale, confidence=cls.confidence, final_rank=rank,
            excluded=cls.excluded, exclusion_reason=cls.exclusion_reason,
        )
        db.add(rec)
        db.flush()
        db.add(RecommendationEvidence(recommendation_id=rec.id, evidence_id=tender_ev.id, role="parameter"))
        db.add(RecommendationEvidence(recommendation_id=rec.id, evidence_id=std_ev.id, role="scope"))
        if not rec.excluded and best_included is None:
            best_included = rec
    if best_included is not None:
        best_included.is_primary = True
    db.commit()


def rerun_requirement(analysis_id: str, requirement_id: str) -> None:
    """Officer edited a requirement → re-recommend just this one."""
    with SessionLocal() as db:
        analysis = db.get(Analysis, analysis_id)
        requirement = db.get(Requirement, requirement_id)
        if analysis and requirement:
            _recommend_for(db, analysis, requirement)


def _referenced_norms(attributes: list[dict]) -> set[str]:
    return {
        normalize_is_number(a["raw_value"])
        for a in attributes
        if a.get("key") == "referenced_standard" and a.get("raw_value")
    }


def _to_float(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None
