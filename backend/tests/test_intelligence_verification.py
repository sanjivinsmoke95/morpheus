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
        assert metrics["morpheus"]["evidence_precision"] == 1.0
        assert metrics["morpheus"]["applicability_f1"] is not None
        assert metrics["morpheus"]["applicability_f1"] > 0.0
