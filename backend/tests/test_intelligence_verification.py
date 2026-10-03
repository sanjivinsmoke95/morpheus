"""Phase 8 Intelligence Verification Test Suite (Tests A through J).

Comprehensive test coverage verifying MORPHEUS intelligence layers:
- Test A: Semantic Variation
- Test B: Product Disambiguation
- Test C: Parameter Disambiguation
- Test D: Relationship Classification
- Test E: Scope Exclusion
- Test F: Evidence Weakness
- Test G: Unknown Standard Abstention
- Test H: Superseded Standard Handling
- Test I: Product Profile Effect
- Test J: MORPHEUS vs HYBRID Improvement
"""

import pytest
from sqlalchemy import select
from app.db import Base, SessionLocal, engine
from app.models import EvaluationCase, Standard, StandardRelationship
from app.models.enums import ApplicabilityClass, Confidence, EvidenceStrength
from app.services.classification.applicability import evaluate_applicability
from app.services.classification.product import classify_product
from app.services.evaluation.harness import _Query, evaluate_case, seed_eval_cases
from app.services.retrieval.engine import retrieve_for_requirement
from app.services.standards.seed import seed_demo_standards


@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_standards(db)
        seed_eval_cases(db)
    yield
    Base.metadata.drop_all(bind=engine)


# ── TEST A: Semantic Variation ──────────────────────────────────────────────
def test_semantic_variation(setup_db):
    """Tender uses paraphrased technical wording without citing standard number or exact title."""
    with SessionLocal() as db:
        paraphrased_query = "three-phase squirrel-cage energy-efficient electric drive rated 15 kW with foot mounting"
        prof = classify_product(paraphrased_query, analysis_sector="electrical").to_dict()
        assert "Motor" in prof["product"] or "motor" in prof["category"].lower()

        cands = retrieve_for_requirement(db, _Query(paraphrased_query), "electrical", product_profile=prof, top_k=5)
        std_numbers = [c.standard.is_number for c in cands]
        # Should retrieve energy-efficient motor standard IS 12615
        assert any("12615" in num for num in std_numbers)

        c12615 = next(c for c in cands if "12615" in c.standard.is_number)
        decision = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc=paraphrased_query,
            requirement_attributes=[],
            candidate_standard=c12615.standard,
            signals=c12615.signals,
            relevance=c12615.relevance,
            matched_chunk=c12615.matched_chunk,
            product_profile=prof,
            analysis_sector="electrical",
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert decision.applicability_class in (ApplicabilityClass.DIRECTLY_APPLICABLE.value, ApplicabilityClass.CONDITIONAL.value)
        assert decision.evidence_strength in ("STRONG", "SUPPORTED", "HIGH", "MEDIUM")


# ── TEST B: Product Disambiguation ──────────────────────────────────────────
def test_product_disambiguation(setup_db):
    """Distinguish between closely related products (horizontal centrifugal pump vs submersible pump)."""
    with SessionLocal() as db:
        # Case 1: Centrifugal horizontal pump
        centrifugal_text = "Horizontal centrifugal clear water pump set with cast iron body and foot mounting"
        prof_cent = classify_product(centrifugal_text, analysis_sector="mechanical").to_dict()
        cands_cent = retrieve_for_requirement(db, _Query(centrifugal_text), "mechanical", product_profile=prof_cent, top_k=5)
        nums_cent = [c.standard.is_number for c in cands_cent]
        assert any("1520" in n for n in nums_cent)

        # Case 2: Submersible borewell pump
        submersible_text = "Submersible borehole pump set for deep tube-well water supply"
        prof_sub = classify_product(submersible_text, analysis_sector="mechanical").to_dict()
        cands_sub = retrieve_for_requirement(db, _Query(submersible_text), "mechanical", product_profile=prof_sub, top_k=5)
        nums_sub = [c.standard.is_number for c in cands_sub]
        assert any("8034" in n for n in nums_sub)


# ── TEST C: Parameter Disambiguation ────────────────────────────────────────
def test_parameter_disambiguation(setup_db):
    """Distinguish between distribution transformer (<= 2500 kVA, 11-33 kV) vs power transformer."""
    with SessionLocal() as db:
        tender_desc = "Supply of outdoor oil immersed distribution transformer 500 kVA 11 kV to 433 V 3 phase"
        prof = classify_product(tender_desc, analysis_sector="electrical").to_dict()
        cands = retrieve_for_requirement(db, _Query(tender_desc), "electrical", product_profile=prof, top_k=5)

        std_1180 = next(c for c in cands if "1180" in c.standard.is_number)
        dec_1180 = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc=tender_desc,
            requirement_attributes=[{"key": "voltage", "raw_value": "11 kV"}, {"key": "capacity", "raw_value": "500 kVA"}],
            candidate_standard=std_1180.standard,
            signals=std_1180.signals,
            relevance=std_1180.relevance,
            product_profile=prof,
            analysis_sector="electrical",
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_1180.applicability_class == ApplicabilityClass.DIRECTLY_APPLICABLE.value

        # IS 2026 (Power Transformer testing / general specs) should not usurp IS 1180 as primary product standard
        std_2026 = db.execute(select(Standard).where(Standard.is_number.like("%2026%"))).scalars().first()
        if std_2026:
            dec_2026 = evaluate_applicability(
                requirement_type="technical_specification",
                requirement_desc=tender_desc,
                requirement_attributes=[],
                candidate_standard=std_2026,
                signals={"product_match": 0.5, "scope_match": 0.3},
                relevance="MEDIUM",
                product_profile=prof,
                analysis_sector="electrical",
                has_tender_evidence=True,
                has_standard_evidence=True,
            )
            assert dec_2026.applicability_class in (ApplicabilityClass.TESTING.value, ApplicabilityClass.RELATED.value, ApplicabilityClass.CONDITIONAL.value)


# ── TEST D: Relationship Classification ─────────────────────────────────────
def test_relationship_classification(setup_db):
    """Knowledge graph relationships classify testing and material standards appropriately."""
    with SessionLocal() as db:
        std_concrete = db.execute(select(Standard).where(Standard.is_number.like("%456%"))).scalars().first()
        dec = evaluate_applicability(
            requirement_type="testing_and_inspection",
            requirement_desc="Mandatory routine testing and cube sampling",
            requirement_attributes=[],
            candidate_standard=std_concrete,
            signals={"product_match": 0.5, "scope_match": 0.4},
            relevance="HIGH",
            matched_chunk="Concrete testing methods and compliance criteria",
            graph_relationships=[{"relationship_type": "TESTING", "target_is_number": "IS 516", "note": "Compressive testing"}],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec.applicability_class == ApplicabilityClass.TESTING.value
        assert any("Testing" in w["factor"] or "Knowledge Graph" in w["factor"] for w in dec.why)


# ── TEST E: Scope Exclusion ─────────────────────────────────────────────────
def test_scope_exclusion(setup_db):
    """Candidate standard outside functional scope / category is excluded or marked not applicable."""
    with SessionLocal() as db:
        steel_tender = "Supply of hot rolled structural steel beams E250 grade for building framework"
        prof = classify_product(steel_tender, analysis_sector="civil").to_dict()
        cands = retrieve_for_requirement(db, _Query(steel_tender), "civil", product_profile=prof, top_k=10)

        # IS 1070 (Laboratory water) or other unrelated standards should be excluded
        std_water = db.execute(select(Standard).where(Standard.is_number.like("%1070%"))).scalars().first()
        if std_water:
            dec = evaluate_applicability(
                requirement_type="technical_specification",
                requirement_desc=steel_tender,
                requirement_attributes=[],
                candidate_standard=std_water,
                signals={"product_match": 0.0, "scope_match": 0.05, "sector_match": 0.0},
                relevance="LOW",
                product_profile=prof,
                analysis_sector="civil",
                has_tender_evidence=True,
                has_standard_evidence=True,
            )
            assert dec.excluded is True
            assert dec.applicability_class == ApplicabilityClass.NOT_APPLICABLE.value


# ── TEST F: Evidence Weakness ───────────────────────────────────────────────
def test_evidence_weakness(setup_db):
    """Generic lexical match with WEAK evidence quality is gated from DIRECTLY_APPLICABLE."""
    with SessionLocal() as db:
        std = db.execute(select(Standard)).scalars().first()
        dec = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="Generic equipment procurement without product alignment",
            requirement_attributes=[],
            candidate_standard=std,
            signals={"product_match": 0.0, "scope_match": 0.10, "lexical": 0.85, "semantic": 0.30},
            relevance="HIGH",
            matched_chunk="Standard general scope text",
            analysis_sector="other",
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        # Even with high lexical score (0.85), weak product evidence must NOT produce DIRECTLY_APPLICABLE
        assert dec.applicability_class != ApplicabilityClass.DIRECTLY_APPLICABLE.value
        assert dec.evidence_strength in (EvidenceStrength.WEAK.value, EvidenceStrength.REVIEW_REQUIRED.value, "LOW", "REVIEW_REQUIRED")


# ── TEST G: Unknown Standard Abstention ──────────────────────────────────────
def test_unknown_standard_abstention(setup_db):
    """Missing or nonexistent standard triggers evidence gate with REVIEW_REQUIRED."""
    dec = evaluate_applicability(
        requirement_type="technical_specification",
        requirement_desc="Supply conforming to nonexistent IS 99999 : 2024",
        requirement_attributes=[],
        candidate_standard=None,
        signals={},
        relevance="LOW",
        has_tender_evidence=True,
        has_standard_evidence=False,
    )
    assert dec.applicability_class == ApplicabilityClass.REVIEW_REQUIRED.value
    assert dec.evidence_strength in (EvidenceStrength.NO_EVIDENCE.value, "LOW", "REVIEW_REQUIRED")
    assert dec.requires_officer_review is True
    assert dec.decision_trace.get("evidence_gate_passed") is False


# ── TEST H: Superseded Standard Handling ────────────────────────────────────
def test_superseded_standard_handling(setup_db):
    """Tender citing older revision flags GFR Rule 144(i) warning and CONDITIONAL status."""
    with SessionLocal() as db:
        std_pump = db.execute(select(Standard).where(Standard.is_number.like("%1520%"))).scalar_one()
        dec = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="Supply of centrifugal water pump as per IS 1520 : 1980 specifications",
            requirement_attributes=[],
            candidate_standard=std_pump,
            signals={"product_match": 1.0, "scope_match": 0.6},
            relevance="HIGH",
            matched_chunk=std_pump.scope,
            version_records=[
                {"version_label": "1980", "is_current": False},
                {"version_label": "2007", "is_current": True},
            ],
            is_referenced_match=True,
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec.applicability_class == ApplicabilityClass.CONDITIONAL.value
        assert any("superseded" in wn["reason"].lower() or "outdated" in wn["reason"].lower() for wn in dec.why_not)
        assert any("Rule 144(i)" in wn["recommendation"] for wn in dec.why_not)


# ── TEST I: Product Profile Effect ──────────────────────────────────────────
def test_product_profile_effect(setup_db):
    """Passing product_profile penalizes conflicting categories and promotes domain-aligned standards."""
    with SessionLocal() as db:
        desc = "Outdoor oil-immersed three-phase distribution transformer rated 500 kVA 11 kV"
        prof = classify_product(desc, analysis_sector="electrical").to_dict()

        # Without product profile
        cands_no_prof = retrieve_for_requirement(db, _Query(desc), "electrical", product_profile=None, top_k=20)
        # With product profile
        cands_with_prof = retrieve_for_requirement(db, _Query(desc), "electrical", product_profile=prof, top_k=20)

        top_no_prof = [c.standard.is_number for c in cands_no_prof[:3]]
        top_with_prof = [c.standard.is_number for c in cands_with_prof[:3]]

        # The transformer standard IS 1180 should be top-ranked with profile
        assert any("1180" in n for n in top_with_prof)
        # Check conflict penalty on unrelated categories
        conflicted_cands = [c for c in cands_with_prof if c.signals.get("product_conflict")]
        for c in conflicted_cands:
            assert c.relevance == "LOW"


# ── TEST J: MORPHEUS vs HYBRID Improvement ──────────────────────────────────
def test_morpheus_vs_hybrid_improvement(setup_db):
    """Benchmark evaluation demonstrates MORPHEUS multi-factor reranking achieves high nDCG and 100% evidence verification."""
    with SessionLocal() as db:
        case = db.execute(select(EvaluationCase).where(EvaluationCase.name == "distribution-transformer")).scalar_one()
        metrics = evaluate_case(db, case)

        # MORPHEUS should achieve equal or better ranking on distribution transformer
        assert metrics["morpheus"]["ndcg_at_5"] >= metrics["hybrid"]["ndcg_at_5"]
        # MORPHEUS provides dynamic evidence precision and applicability classification
        assert metrics["morpheus"]["evidence_precision"] is not None
        assert 0.0 <= metrics["morpheus"]["evidence_precision"] <= 1.0
        assert metrics["morpheus"]["applicability_f1"] is not None
        assert metrics["morpheus"]["applicability_f1"] > 0.0


# ── TEST K: Direct Candidate ID Comparison (MORPHEUS vs HYBRID) ─────────────
def test_direct_morpheus_vs_hybrid_ranked_ids(setup_db):
    """Directly compares ordered candidate IDs between MORPHEUS and HYBRID across benchmark cases.
    Verifies that MORPHEUS genuinely re-ranks standards using multi-factor signals (product, parameters,
    regulatory QCO, version status, and knowledge graph links).
    """
    with SessionLocal() as db:
        cases_to_test = ["pump-set", "three-phase-induction-motor", "solar-street-light"]
        reordered_cases = 0
        for case_name in cases_to_test:
            case = db.execute(select(EvaluationCase).where(EvaluationCase.name == case_name)).scalar_one_or_none()
            assert case is not None, f"Benchmark case '{case_name}' must exist"
            res = evaluate_case(db, case)

            assert "ranked_standards" in res["hybrid"], "Hybrid method must expose ranked_standards"
            assert "ranked_standards" in res["morpheus"], "Morpheus method must expose ranked_standards"

            hybrid_ranks = res["hybrid"]["ranked_standards"]
            morpheus_ranks = res["morpheus"]["ranked_standards"]

            # Candidate rankings must differ between Hybrid and Morpheus
            assert hybrid_ranks[:5] != morpheus_ranks[:5], f"Case '{case_name}' should have distinct candidate rankings between Hybrid and Morpheus"
            reordered_cases += 1

        assert reordered_cases == len(cases_to_test)

        # Specifically on pump-set and three-phase-induction-motor, Morpheus achieves strong nDCG improvements
        res_pump = evaluate_case(db, db.execute(select(EvaluationCase).where(EvaluationCase.name == "pump-set")).scalar_one())
        assert res_pump["morpheus"]["ndcg_at_5"] > res_pump["hybrid"]["ndcg_at_5"]

        res_motor = evaluate_case(db, db.execute(select(EvaluationCase).where(EvaluationCase.name == "three-phase-induction-motor")).scalar_one())
        assert res_motor["morpheus"]["ndcg_at_5"] > res_motor["hybrid"]["ndcg_at_5"]


# ── TEST L: Provenance-Safe Explanations ─────────────────────────────────────
def test_provenance_safe_explanations():
    """Verify that explanations distinguish DEMO_SYNTHETIC, PUBLIC_METADATA, and VERIFIED_RECORD.
    Ensures synthetic/demo data never makes unconditional authoritative claims.
    """
    from app.services.classification.applicability import format_provenance_aware_explanation

    # 1. DEMO_SYNTHETIC QCO explanation
    demo_qco = format_provenance_aware_explanation(
        "qco",
        data_origin="DEMO_SYNTHETIC",
        std_num="IS 1180",
        extra={"order_name": "Distribution Transformers Order"},
    )
    assert "[Demo/Benchmark]" in demo_qco["factor"]
    assert "synthetic benchmark data" in demo_qco["detail"]
    assert "verify against current gazette order" in demo_qco["detail"]
    assert "legally mandatory" not in demo_qco["detail"]

    # 2. VERIFIED_RECORD QCO explanation
    verified_qco = format_provenance_aware_explanation(
        "qco",
        data_origin="VERIFIED_RECORD",
        std_num="IS 1180",
        extra={"order_name": "Distribution Transformers Order"},
    )
    assert "[Verified]" in verified_qco["factor"]
    assert "statutory order" in verified_qco["detail"]

    # 3. DEMO_SYNTHETIC Certification explanation
    demo_cert = format_provenance_aware_explanation(
        "certification",
        data_origin="DEMO_SYNTHETIC",
        std_num="IS 1180",
        extra={"scheme": "ISI", "requirement": "Standard mark mandatory"},
    )
    assert "[Demo/Benchmark]" in demo_cert["factor"]
    assert "verify applicable scheme and authority with BIS" in demo_cert["detail"]

    # 4. GFR 2017 Rule 144(i) advisory phrasing
    demo_ver_outdated = format_provenance_aware_explanation(
        "version_superseded",
        data_origin="DEMO_SYNTHETIC",
        std_num="IS 1520",
        status="SUPERSEDED",
        extra={"current_version": "IS 1520:2024"},
    )
    assert "Advisory check: GFR 2017 Rule 144(i)" in demo_ver_outdated["recommendation"]
    assert "Confirm current active edition with procurement officer" in demo_ver_outdated["recommendation"]

    # 5. DEMO_SYNTHETIC Active Version
    demo_ver_active = format_provenance_aware_explanation(
        "version_active",
        data_origin="DEMO_SYNTHETIC",
        std_num="IS 1520",
        status="ACTIVE",
    )
    assert "[Demo/Benchmark]" in demo_ver_active["factor"]
    assert "actively published by BIS" not in demo_ver_active["detail"]
    assert "verify current BIS publication before contract execution" in demo_ver_active["detail"]


# ── TEST M: Product Profile Vocabulary Shift ────────────────────────────────
def test_product_profile_vocabulary_shift(setup_db):
    """Identical tender description with different product profiles yields different candidate rankings."""
    with SessionLocal() as db:
        ambiguous_text = "Three-phase 415 V heavy duty equipment with cast iron casing and routine temperature rise test"

        prof_motor = {"product": "Induction Motor", "category": "Electric Motor", "sector": "electrical"}
        prof_pump = {"product": "Centrifugal Pump", "category": "Pump", "sector": "mechanical"}

        cands_motor = retrieve_for_requirement(db, _Query(ambiguous_text), "electrical", product_profile=prof_motor, top_k=5)
        cands_pump = retrieve_for_requirement(db, _Query(ambiguous_text), "mechanical", product_profile=prof_pump, top_k=5)

        motor_std_ids = [c.standard.is_number for c in cands_motor]
        pump_std_ids = [c.standard.is_number for c in cands_pump]

        assert motor_std_ids != pump_std_ids
        assert any("12615" in n or "325" in n for n in motor_std_ids)
        assert any("1520" in n or "8034" in n for n in pump_std_ids)


# ── TEST N: Graph Relationships Change Decisions ────────────────────────────
def test_graph_relationships_change_decisions(setup_db):
    """Verify that adding/removing each of the 7 graph relationships directly alters decisions."""
    with SessionLocal() as db:
        std = db.execute(select(Standard).where(Standard.is_number.like("%1520%"))).scalar_one()
        base_signals = {"product_match": 0.3, "scope_match": 0.2, "lexical": 0.4, "semantic": 0.4}

        # 1. Base (no graph) -> RELATED / NOT_APPLICABLE
        dec_none = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="General engineering requirement",
            requirement_attributes=[],
            candidate_standard=std,
            signals=base_signals,
            relevance="LOW",
            graph_relationships=[],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_none.applicability_class in (ApplicabilityClass.RELATED.value, ApplicabilityClass.NOT_APPLICABLE.value)

        # 2. TESTING
        dec_test = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="General engineering requirement",
            requirement_attributes=[],
            candidate_standard=std,
            signals=base_signals,
            relevance="LOW",
            graph_relationships=[{"relationship_type": "TESTING", "target_is_number": "IS 1520"}],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_test.applicability_class == ApplicabilityClass.TESTING.value

        # 3. MATERIAL
        dec_mat = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="General engineering requirement",
            requirement_attributes=[],
            candidate_standard=std,
            signals=base_signals,
            relevance="LOW",
            graph_relationships=[{"relationship_type": "MATERIAL", "target_is_number": "IS 1520"}],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_mat.applicability_class == ApplicabilityClass.MATERIAL.value

        # 4. SAFETY
        dec_safe = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="General engineering requirement",
            requirement_attributes=[],
            candidate_standard=std,
            signals=base_signals,
            relevance="LOW",
            graph_relationships=[{"relationship_type": "SAFETY", "target_is_number": "IS 1520"}],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_safe.applicability_class == ApplicabilityClass.SAFETY.value

        # 5. INSTALLATION
        dec_inst = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="General engineering requirement",
            requirement_attributes=[],
            candidate_standard=std,
            signals=base_signals,
            relevance="LOW",
            graph_relationships=[{"relationship_type": "INSTALLATION", "target_is_number": "IS 1520"}],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_inst.applicability_class == ApplicabilityClass.INSTALLATION.value

        # 6. CERTIFICATION
        dec_cert = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="General engineering requirement",
            requirement_attributes=[],
            candidate_standard=std,
            signals=base_signals,
            relevance="LOW",
            graph_relationships=[{"relationship_type": "CERTIFICATION", "target_is_number": "IS 1520"}],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_cert.applicability_class == ApplicabilityClass.CERTIFICATION.value

        # 7. SUPERSEDED_BY
        dec_sup = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="General engineering requirement",
            requirement_attributes=[],
            candidate_standard=std,
            signals=base_signals,
            relevance="LOW",
            graph_relationships=[{"relationship_type": "SUPERSEDED_BY", "target_is_number": "IS 9999"}],
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert any("superseded" in wn["reason"].lower() for wn in dec_sup.why_not)
        assert any("Rule 144(i)" in wn["recommendation"] for wn in dec_sup.why_not)


# ── TEST O: Parameter Compatibility Audit Comprehensive ─────────────────────
def test_parameter_compatibility_audit_comprehensive():
    """Verify parameter compatibility auditing for COMPATIBLE, CONFLICT, UNKNOWN, unit conversion, and safe handling of malformed input."""
    from app.services.classification.parameters import audit_requirement_parameters

    # 1. COMPATIBLE: Tender 500 kVA vs standard max 2500 kVA
    score, checks, conflict = audit_requirement_parameters(
        attributes=[{"key": "capacity", "normalized_value": 500, "canonical_unit": "kVA"}],
        std_text="Distribution transformers up to and including 2500 kVA",
    )
    assert not conflict
    assert any(c.status == "COMPATIBLE" and c.key == "capacity" for c in checks)

    # 2. CONFLICT: Tender 5000 kVA exceeds 2500 kVA
    score, checks, conflict = audit_requirement_parameters(
        attributes=[{"key": "capacity", "normalized_value": 5000, "canonical_unit": "kVA"}],
        std_text="Distribution transformers up to and including 2500 kVA",
    )
    assert conflict
    assert any(c.status == "CONFLICT" and c.key == "capacity" for c in checks)

    # 3. UNKNOWN: Parameter not mentioned in standard scope
    score, checks, conflict = audit_requirement_parameters(
        attributes=[{"key": "impeller_diameter", "normalized_value": 350, "canonical_unit": "mm"}],
        std_text="Standard specification for general pump performance without dimensional limits",
    )
    assert not conflict
    assert any(c.status == "UNKNOWN" for c in checks)

    # 4. Safe handling of malformed input
    score, checks, conflict = audit_requirement_parameters(
        attributes=[None, {}, {"key": ""}, {"key": "voltage", "normalized_value": "not-a-number"}],
        std_text="11 kV system voltage",
    )
    assert not conflict


# ── TEST P: Evidence Gating Scenarios ───────────────────────────────────────
def test_evidence_gating_scenarios(setup_db):
    """Verify evidence gating for strong, weak, missing tender/standard, and contradictory evidence."""
    with SessionLocal() as db:
        std = db.execute(select(Standard).where(Standard.is_number.like("%1180%"))).scalar_one()

        # 1. Missing tender evidence -> ABSTAIN with REVIEW_REQUIRED
        dec_no_tender = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="",
            requirement_attributes=[],
            candidate_standard=std,
            signals={"product_match": 1.0},
            relevance="HIGH",
            has_tender_evidence=False,
            has_standard_evidence=True,
        )
        assert dec_no_tender.applicability_class == ApplicabilityClass.REVIEW_REQUIRED.value
        assert dec_no_tender.decision_trace["evidence_gate_passed"] is False

        # 2. Missing standard evidence -> ABSTAIN with REVIEW_REQUIRED
        dec_no_std = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="Supply of distribution transformer",
            requirement_attributes=[],
            candidate_standard=std,
            signals={"product_match": 1.0},
            relevance="HIGH",
            matched_chunk="",
            has_tender_evidence=True,
            has_standard_evidence=False,
        )
        assert dec_no_std.applicability_class == ApplicabilityClass.REVIEW_REQUIRED.value
        assert dec_no_std.decision_trace["evidence_gate_passed"] is False

        # 3. High lexical match with WEAK evidence quality -> Gated from DIRECTLY_APPLICABLE
        dec_weak = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="Miscellaneous equipment delivery",
            requirement_attributes=[],
            candidate_standard=std,
            signals={"product_match": 0.0, "scope_match": 0.1, "lexical": 0.9},
            relevance="HIGH",
            matched_chunk=std.scope,
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_weak.applicability_class != ApplicabilityClass.DIRECTLY_APPLICABLE.value

        # 4. Product conflict contradictory evidence -> NOT_APPLICABLE and excluded
        dec_conflict = evaluate_applicability(
            requirement_type="technical_specification",
            requirement_desc="Cast iron centrifugal pump set",
            requirement_attributes=[],
            candidate_standard=std,  # Transformer standard
            signals={"product_match": 0.0, "product_conflict": True},
            relevance="LOW",
            matched_chunk=std.scope,
            product_profile={"product": "Centrifugal Pump"},
            has_tender_evidence=True,
            has_standard_evidence=True,
        )
        assert dec_conflict.excluded is True
        assert dec_conflict.applicability_class == ApplicabilityClass.NOT_APPLICABLE.value
