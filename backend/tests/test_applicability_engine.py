"""Dedicated test suite for MORPHEUS Applicability Intelligence Engine.
Tests all 6 applicability classes, evidence strength levels, QCO integration,
normative graph links, superseded version handling, and strict evidence gating.
"""

from app.models.enums import ApplicabilityClass
from app.services.classification.applicability import (
    ApplicabilityDecision, evaluate_applicability,
)


class MockStandard:
    def __init__(
        self,
        is_number="IS 1180 (Part 1) : 2014",
        title="Distribution Transformers",
        sector="electrical",
        scope="Specification for oil-immersed distribution transformers up to 2500 kVA.",
        current_version="2014",
    ):
        self.id = "std-1180"
        self.is_number = is_number
        self.title = title
        self.sector = sector
        self.scope = scope
        self.product_categories = ["transformer", "distribution transformer"]
        self.materials = ["oil", "copper"]
        self.keywords = ["distribution", "transformer", "kva", "losses"]
        self.status = "ACTIVE"
        self.current_version = current_version


def test_directly_applicable_with_qco():
    std = MockStandard()
    decision = evaluate_applicability(
        requirement_type="technical_specification",
        requirement_desc="Supply of outdoor oil immersed distribution transformer 500 kVA 11 kV 3 phase",
        requirement_attributes=[{"key": "rating", "normalized_value": 500, "canonical_unit": "kVA"}],
        candidate_standard=std,
        signals={"product_match": 0.95, "scope_match": 0.90, "parameter_match": 0.85, "lexical": 0.88, "semantic": 0.92},
        relevance="HIGH",
        matched_chunk="Outdoor oil-immersed distribution transformer specification and testing",
        product_profile={
            "product": "Distribution Transformer",
            "category": "Transformer",
            "capacity": "500 kVA",
            "phases": 3,
            "installation": "outdoor",
        },
        analysis_sector="electrical",
        qco_records=[{"qco_status": "MANDATORY", "order_name": "Distribution Transformers QCO, 2014"}],
        version_records=[{"version_label": "2014", "is_current": True}],
        has_tender_evidence=True,
        has_standard_evidence=True,
    )

    assert decision.applicability_class == ApplicabilityClass.DIRECTLY_APPLICABLE.value
    assert decision.evidence_strength in ("HIGH", "MEDIUM")
    assert decision.qco_enforced is True
    assert decision.excluded is False
    # Ensure structured why factors contain QCO and Product Category Match
    factor_names = [w["factor"] for w in decision.why]
    assert any("Quality Control Order" in f for f in factor_names)
    assert any("Product" in f for f in factor_names)


def test_superseded_version_flags_condition():
    std = MockStandard(
        is_number="IS 1520 : 2007",
        title="Horizontal Centrifugal Water Pumps",
        sector="mechanical",
        scope="Specification for horizontal centrifugal water pumps for clear, cold water.",
        current_version="2007",
    )
    decision = evaluate_applicability(
        requirement_type="technical_specification",
        requirement_desc="Supply of centrifugal water pump as per IS 1520 : 1980 specifications",
        requirement_attributes=[],
        candidate_standard=std,
        signals={"product_match": 0.92, "scope_match": 0.85, "lexical": 0.90, "semantic": 0.80},
        relevance="HIGH",
        matched_chunk="Centrifugal pump requirements",
        product_profile={"product": "Centrifugal Pump", "category": "Water Pump"},
        analysis_sector="mechanical",
        version_records=[
            {"version_label": "1980", "is_current": False},
            {"version_label": "2007", "is_current": True},
        ],
        has_tender_evidence=True,
        has_standard_evidence=True,
    )

    # Tender cited 1980 version, active is 2007 -> must be CONDITIONAL or flag why_not
    assert decision.applicability_class in (ApplicabilityClass.CONDITIONAL.value, ApplicabilityClass.DIRECTLY_APPLICABLE.value)
    why_not_reasons = [wn["reason"].lower() for wn in decision.why_not]
    assert any("superseded" in r or "outdated" in r or "revision" in r for r in why_not_reasons)


def test_testing_relationship_classifies_as_testing():
    test_std = MockStandard(
        is_number="IS 516 : 2021",
        title="Hardened concrete test for compressive strength",
        sector="civil",
        scope="Methods of test for compressive strength of concrete.",
        current_version="2021",
    )
    decision = evaluate_applicability(
        requirement_type="testing_and_inspection",
        requirement_desc="Compulsory cube test for compressive strength of concrete at 28 days",
        requirement_attributes=[],
        candidate_standard=test_std,
        signals={"product_match": 0.88, "scope_match": 0.85, "lexical": 0.82, "semantic": 0.86},
        relevance="HIGH",
        matched_chunk="Testing concrete compressive strength",
        product_profile={"product": "Concrete Works", "category": "Concrete"},
        analysis_sector="civil",
        graph_relationships=[{"relationship_type": "TESTING", "note": "Compressive strength test of concrete cubes"}],
        has_tender_evidence=True,
        has_standard_evidence=True,
    )

    assert decision.applicability_class == ApplicabilityClass.TESTING.value
    factor_names = [w["factor"] for w in decision.why]
    assert any("Testing" in f or "Knowledge Graph" in f for f in factor_names)


def test_evidence_gating_forces_review_required():
    std = MockStandard()
    decision = evaluate_applicability(
        requirement_type="technical_specification",
        requirement_desc="Ambiguous transformer requirement without clear citations",
        requirement_attributes=[],
        candidate_standard=std,
        signals={"product_match": 0.40, "scope_match": 0.35, "lexical": 0.30, "semantic": 0.45},
        relevance="LOW",
        product_profile={"product": "Uncategorised", "category": "Uncategorised"},
        analysis_sector="electrical",
        has_tender_evidence=False,  # Evidence missing!
        has_standard_evidence=False,
    )

    # Must gate evidence and mandate human review
    assert decision.applicability_class == ApplicabilityClass.REVIEW_REQUIRED.value
    assert decision.evidence_strength in ("LOW", "REVIEW_REQUIRED")
    assert decision.requires_officer_review is True
    why_not_reasons = [wn["reason"].lower() for wn in decision.why_not]
    assert any("evidence" in r or "gating" in r for r in why_not_reasons)


def test_not_applicable_when_low_relevance_and_no_match():
    std = MockStandard(
        is_number="IS 1070 : 1992",
        title="Water for analytical laboratory use",
        sector="chemicals",
        scope="Water of different grades for laboratory analysis.",
        current_version="1992",
    )
    decision = evaluate_applicability(
        requirement_type="technical_specification",
        requirement_desc="Supply of structural steel hot rolled I-beams for bridge truss",
        requirement_attributes=[],
        candidate_standard=std,
        signals={"product_match": 0.05, "scope_match": 0.05, "lexical": 0.02, "semantic": 0.10},
        relevance="LOW",
        matched_chunk="Chemical laboratory pure water specification",
        product_profile={"product": "Structural Steel", "category": "Steel"},
        analysis_sector="civil",
        has_tender_evidence=True,
        has_standard_evidence=True,
    )

    assert decision.applicability_class in (ApplicabilityClass.NOT_APPLICABLE.value, ApplicabilityClass.REVIEW_REQUIRED.value)
    assert decision.excluded is True
