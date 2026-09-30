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
    trace: list[dict] = []
    try:
        _extract_requirements(db, analysis, trace)
        _classify_product(db, analysis, trace)
        _recommend_all(db, analysis, trace)
        _audit(db, analysis, trace)
        analysis.decision_trace_json = trace
        _set_status(db, analysis, AnalysisStatus.READY)
    except Exception as exc:  # noqa: BLE001 — record the failing stage, don't crash the worker
        logger.exception("pipeline failed for analysis %s", analysis.id)
        _set_status(db, analysis, AnalysisStatus.FAILED, error=str(exc)[:500])


def _trace(trace: list[dict], step: str, detail: str) -> None:
    trace.append({"n": len(trace) + 1, "step": step, "detail": detail})


def _classify_product(db: Session, analysis: Analysis, trace: list[dict]) -> None:
    """Derive the product/domain profile from the extracted requirements (Phase 1)."""
    from app.services.classification.product import classify_product
    reqs = db.execute(select(Requirement).where(Requirement.analysis_id == analysis.id)).scalars().all()
    req_dicts = []
    for r in reqs:
        req_dicts.append({
            "description": r.description, "requirement_type": r.requirement_type,
            "attributes": _attrs_of(db, r),
        })
    profile = classify_product(req_dicts, analysis.sector)
    analysis.product_profile_json = profile.to_dict()
    # If the analysis had no sector, adopt the classifier's.
    if not analysis.sector and profile.sector:
        analysis.sector = profile.sector
    db.commit()
    _trace(trace, "Product classified",
           f"{profile.product_category}"
           + (f" · {profile.sub_category}" if profile.sub_category else "")
           + (f" · {profile.sector}" if profile.sector else ""))


def run_pipeline(analysis_id: str) -> None:
    """Background-worker entry point. Opens its own session."""
    with SessionLocal() as db:
        analysis = db.get(Analysis, analysis_id)
        if analysis:
            run_analysis(db, analysis)


def _extract_requirements(db: Session, analysis: Analysis, trace: list[dict]) -> None:
    _set_status(db, analysis, AnalysisStatus.EXTRACTING_REQUIREMENTS)
    pages = db.execute(
        select(DocumentPage).where(DocumentPage.document_id == analysis.document_id).order_by(DocumentPage.page_number)
    ).scalars().all()
    # Clear any prior extraction (idempotent re-run).
    db.execute(delete(Requirement).where(Requirement.analysis_id == analysis.id))
    db.flush()

    # Multilingual pre-pass (Phase 3): detect languages + produce canonical English text.
    from app.services.extraction.multilingual import analyse_languages, canonicalize_pages
    page_pairs = [(p.page_number, p.text) for p in pages]
    langs = analyse_languages(page_pairs)
    analysis.languages_json = langs
    canonical_pages = canonicalize_pages(page_pairs)

    reqs = run_extraction(canonical_pages)
    lang_names = ", ".join(dict.fromkeys(l["language"] for l in langs)) or "English"
    _trace(trace, "Language detected", lang_names)
    orig_pages_dict = {p.page_number: (p.text or "") for p in pages}
    for r in reqs:
        sp = r.get("source_page")
        orig_page_txt = orig_pages_dict.get(sp, "")
        orig_line = _match_original_text(orig_page_txt, r["description"])
        norm_line = r["description"]

        req = Requirement(
            analysis_id=analysis.id, req_code=r["req_code"], requirement_type=r["requirement_type"],
            description=norm_line,
            original_text=orig_line if orig_line != norm_line else None,
            normalized_text=norm_line,
            source_page=sp,
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
    _trace(trace, "Requirements extracted", f"{len(reqs)} structured requirement(s) from {len(pages)} page(s)")


def _match_original_text(orig_page_text: str, canonical_desc: str) -> str:
    """Find corresponding original sentence in untransliterated page text."""
    if not orig_page_text:
        return canonical_desc
    lines = [ln.strip() for ln in orig_page_text.splitlines() if ln.strip()]
    if not lines:
        return canonical_desc
    # Exact match
    for ln in lines:
        if ln.lower() == canonical_desc.lower():
            return ln
    # Non-ASCII / Indic script line match
    import re
    digits = re.findall(r"\d+", canonical_desc)
    from app.services.extraction.multilingual import canonicalize_text
    for ln in lines:
        if any(ch > "\x7f" for ch in ln):
            c_ln = canonicalize_text(ln)
            if any(d in ln for d in digits) or any(w.lower() in c_ln.lower() for w in canonical_desc.split()[:3]):
                return ln
    return canonical_desc


def _recommend_all(db: Session, analysis: Analysis, trace: list[dict]) -> None:
    _set_status(db, analysis, AnalysisStatus.RETRIEVING)
    reqs = db.execute(select(Requirement).where(Requirement.analysis_id == analysis.id)).scalars().all()
    total_recs = 0
    for req in reqs:
        total_recs += _recommend_for(db, analysis, req)
    _set_status(db, analysis, AnalysisStatus.CLASSIFYING)
    db.commit()
    _trace(trace, "Standards retrieved & ranked",
           f"{total_recs} candidate standard(s) across {len(reqs)} requirement(s), applicability-gated")


def _audit(db: Session, analysis: Analysis, trace: list[dict]) -> None:
    _set_status(db, analysis, AnalysisStatus.AUDITING)
    from app.services.audit.conflicts import detect_conflicts
    from app.services.audit.coverage import run_coverage_and_gaps

    conflicts = detect_conflicts(db, analysis.id)
    run_coverage_and_gaps(db, analysis.id)
    # Snapshot for historical comparison of future tenders.
    from app.services.advanced.service import store_as_historical
    store_as_historical(db, analysis)
    db.commit()
    from app.models import Conflict, Gap
    from sqlalchemy import func as _func
    n_conf = db.execute(select(_func.count()).select_from(Conflict).where(Conflict.analysis_id == analysis.id)).scalar_one()
    n_gap = db.execute(select(_func.count()).select_from(Gap).where(Gap.analysis_id == analysis.id)).scalar_one()
    _trace(trace, "Version & amendment checked", "Referenced editions compared to current on file")
    _trace(trace, "QCO / certification checked", "Regulatory records matched to recommended standards")
    _trace(trace, "Coverage, gaps & conflicts computed", f"{n_conf} conflict(s), {n_gap} potential gap(s)")
    _trace(trace, "Officer review required", "Findings are grounded in evidence; the officer decides")


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
    candidates = retrieve_for_requirement(
        db, query, analysis.sector, product_profile=analysis.product_profile_json, top_k=5
    )
    if not candidates:
        return 0

    from app.models import CertificationRecord, QcoRecord, StandardRelationship, StandardVersion
    from app.services.classification.applicability import evaluate_applicability

    # Referenced-standard match?
    referenced = _referenced_norms(query.attributes)
    desc_norm = normalize_is_number(requirement.description)
    best_included: Recommendation | None = None
    for rank, cand in enumerate(candidates, start=1):
        is_ref = (cand.standard.is_number_normalized in referenced) or (
            bool(cand.standard.is_number_normalized) and cand.standard.is_number_normalized in desc_norm
        )
        tender_ev = assemble.tender_evidence(db, requirement, analysis.document_id)
        std_ev = assemble.standard_evidence(db, cand.standard, cand.matched_chunk)

        # Graph relationships for this standard
        graph_rels = []
        rel_out = db.execute(
            select(StandardRelationship, Standard.is_number)
            .join(Standard, Standard.id == StandardRelationship.to_standard_id)
            .where(StandardRelationship.from_standard_id == cand.standard.id)
        ).all()
        for ro, tgt in rel_out:
            graph_rels.append({"relationship_type": ro.relationship_type, "target_is_number": tgt, "note": ro.note})
        rel_in = db.execute(
            select(StandardRelationship, Standard.is_number)
            .join(Standard, Standard.id == StandardRelationship.from_standard_id)
            .where(StandardRelationship.to_standard_id == cand.standard.id)
        ).all()
        for ri, src in rel_in:
            graph_rels.append({"relationship_type": ri.relationship_type, "target_is_number": src, "note": ri.note})

        # Versions, QCO, Cert
        v_rows = db.execute(select(StandardVersion).where(StandardVersion.standard_id == cand.standard.id)).scalars().all()
        v_recs = [{"version_label": v.version_label, "is_current": v.is_current} for v in v_rows]
        q_rows = db.execute(select(QcoRecord).where(QcoRecord.standard_id == cand.standard.id)).scalars().all()
        q_recs = [{"qco_status": q.qco_status, "order_name": q.order_name} for q in q_rows]
        c_rows = db.execute(select(CertificationRecord).where(CertificationRecord.standard_id == cand.standard.id)).scalars().all()
        c_recs = [{"scheme": c.scheme, "requirement": c.requirement} for c in c_rows]

        cls = evaluate_applicability(
            requirement_type=requirement.requirement_type,
            requirement_desc=requirement.description,
            requirement_attributes=query.attributes,
            candidate_standard=cand.standard,
            signals={**cand.signals, "lexical": cand.lexical, "semantic": cand.semantic},
            relevance=cand.relevance,
            matched_chunk=cand.matched_chunk,
            product_profile=analysis.product_profile_json,
            analysis_sector=analysis.sector,
            graph_relationships=graph_rels,
            version_records=v_recs,
            qco_records=q_recs,
            cert_records=c_recs,
            is_referenced_match=is_ref,
            has_tender_evidence=bool(tender_ev and tender_ev.text),
            has_standard_evidence=bool(std_ev and (std_ev.text or cand.matched_chunk)),
        )

        signals_payload = {
            **cand.signals,
            "lexical": round(cand.lexical, 3),
            "semantic": round(cand.semantic, 3),
            "why": cls.why,
            "why_not": cls.why_not,
            "graph_support": cls.graph_support,
            "qco_enforced": cls.qco_enforced,
            "certification_required": cls.certification_required,
            "evidence_strength": str(cls.evidence_strength),
            "decision_trace": cls.decision_trace,
        }

        rec = Recommendation(
            analysis_id=analysis.id, requirement_id=requirement.id, standard_id=cand.standard.id,
            applicability_class=cls.applicability_class, relevance=cand.relevance,
            relevance_score=round(cand.score, 4), retrieval_method=cand.retrieval_method,
            signals_json=signals_payload,
            rationale=cls.rationale, confidence=str(cls.evidence_strength), final_rank=rank,
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
    return len(candidates)


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
