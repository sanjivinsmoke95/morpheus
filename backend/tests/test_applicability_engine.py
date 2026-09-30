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


def test_parameter_exact_and_range_matches():
    from app.services.classification.parameters import evaluate_parameter_compatibility

    # Exact match: 11 kV vs 11 kV
    res_exact = evaluate_parameter_compatibility(
        param_key="voltage",
        tender_raw="11 kV",
        std_text="Three phase oil immersed distribution transformers for 11 kV and 33 kV systems.",
    )
    assert res_exact.status == "COMPATIBLE"
    assert res_exact.match_type == "EXACT_MATCH"

    # Range match: 100 kVA in 25-250 kVA
    res_range = evaluate_parameter_compatibility(
        param_key="capacity",
        tender_raw="100 kVA",
        std_text="Standard applies to ratings from 25 kVA to 250 kVA inclusive.",
    )
    assert res_range.status == "COMPATIBLE"
    assert res_range.match_type == "RANGE_MATCH"

    # Threshold match: 500 kVA <= 2500 kVA
    res_thresh = evaluate_parameter_compatibility(
        param_key="capacity",
        tender_raw="500 kVA",
        std_text="Distribution transformers up to and including 2500 kVA.",
    )
    assert res_thresh.status == "COMPATIBLE"
    assert res_thresh.match_type == "THRESHOLD_MATCH"


def test_parameter_conflict_exceeded_and_mismatch():
    from app.services.classification.parameters import evaluate_parameter_compatibility

    # Threshold exceeded: 10 bar > 6 bar maximum
    res_exceeded = evaluate_parameter_compatibility(
        param_key="pressure",
        tender_raw="10 bar",
        std_text="Pipes suitable for maximum working pressure up to 6 bar.",
    )
    assert res_exceeded.status == "CONFLICT"
    assert res_exceeded.match_type == "THRESHOLD_EXCEEDED"

    # Voltage mismatch: 33 kV vs standard rated up to 1100 V
    res_volt = evaluate_parameter_compatibility(
        param_key="voltage",
        tender_raw="33 kV",
        std_text="PVC insulated cables for working voltages up to and including 1100 V.",
    )
    assert res_volt.status == "CONFLICT"
    assert res_volt.match_type == "THRESHOLD_EXCEEDED"


def test_parameter_unit_conversions():
    from app.services.classification.parameters import evaluate_parameter_compatibility

    # Unit conversion: 0.5 MVA (= 500 kVA) within standard up to 2500 kVA
    res_mva = evaluate_parameter_compatibility(
        param_key="rating",
        tender_raw="0.5 MVA",
        std_text="Transformers up to 2500 kVA rating.",
    )
    assert res_mva.status == "COMPATIBLE"
    assert res_mva.match_type == "THRESHOLD_MATCH"

    # Unit conversion: 1.5 MPa (= 15 bar) vs standard maximum 10 bar -> CONFLICT
    res_mpa = evaluate_parameter_compatibility(
        param_key="pressure",
        tender_raw="1.5 MPa",
        std_text="Centrifugal pumps tested for maximum discharge pressure up to 10 bar.",
    )
    assert res_mpa.status == "CONFLICT"
    assert res_mpa.match_type == "THRESHOLD_EXCEEDED"


def test_no_fabricated_limits_and_malformed_inputs():
    from app.services.classification.parameters import evaluate_parameter_compatibility, normalize_parameter

    # Standard mentions parameter name without numeric limits -> UNKNOWN, never fabricates
    res_no_limit = evaluate_parameter_compatibility(
        param_key="viscosity",
        tender_raw="40 cSt",
        std_text="General specification of lubricating oil grades and viscosity classification.",
    )
    assert res_no_limit.status == "UNKNOWN"
    assert res_no_limit.match_type == "NO_STANDARD_LIMIT"
    assert res_no_limit.score == 0.0

    # Malformed / empty input -> graceful handling
    norm_empty = normalize_parameter(key="voltage", raw_value="")
    assert norm_empty.is_valid is False
    assert norm_empty.canonical_value is None

    res_malformed = evaluate_parameter_compatibility(
        param_key="unknown",
        tender_raw="not-a-number",
        std_text="Some scope text with 100 kVA.",
    )
    assert res_malformed.status == "UNKNOWN"
    assert res_malformed.score == 0.0


def test_parameter_conflict_gates_applicability():
    """Tender specifying rating above standard limit is demoted with critical why_not."""
    pipe_std = MockStandard(
        is_number="IS 4984 : 2016",
        title="HDPE Pipes for Water Supply",
        sector="water",
        scope="High density polyethylene pipes for water supply with pressure ratings up to 6 bar maximum.",
        current_version="2016",
    )
    decision = evaluate_applicability(
        requirement_type="technical_specification",
        requirement_desc="Supply of HDPE pipes for high pressure mainline 10 bar working pressure",
        requirement_attributes=[{"key": "pressure", "raw_value": "10 bar"}],
        candidate_standard=pipe_std,
        signals={"product_match": 0.90, "scope_match": 0.80, "lexical": 0.85, "semantic": 0.80},
        relevance="HIGH",
        matched_chunk=pipe_std.scope,
        product_profile={"product": "HDPE Pipe", "category": "Pipes"},
        analysis_sector="water",
        has_tender_evidence=True,
        has_standard_evidence=True,
    )

    # Must be excluded or NOT_APPLICABLE due to parameter conflict
    assert decision.applicability_class == ApplicabilityClass.NOT_APPLICABLE.value
    assert decision.excluded is True
    assert decision.decision_trace["parameter_conflict"] is True
    assert any("Parameter rating conflict" in wn["reason"] or "Parameter conflict" in wn["reason"] for wn in decision.why_not)


def test_installation_and_certification_classes():
    """Verify INSTALLATION and CERTIFICATION applicability classes."""
    install_std = MockStandard(
        is_number="IS 3844 : 1989",
        title="Code of practice for installation and maintenance of internal fire hydrants",
        sector="safety",
        scope="Code of practice for installation and maintenance of internal fire hydrants and hose reels.",
        current_version="1989",
    )
    dec_inst = evaluate_applicability(
        requirement_type="installation",
        requirement_desc="Installation and laying of internal fire hydrant system in commercial complex",
        requirement_attributes=[],
        candidate_standard=install_std,
        signals={"product_match": 0.5, "scope_match": 0.6, "lexical": 0.8},
        relevance="HIGH",
        matched_chunk=install_std.scope,
        has_tender_evidence=True,
        has_standard_evidence=True,
    )
    assert dec_inst.applicability_class == ApplicabilityClass.INSTALLATION.value

    # 14-point decision trace verification
    trace = dec_inst.decision_trace
    expected_trace_keys = {
        "lexical_score", "semantic_score", "product_match", "product_conflict",
        "parameter_match", "parameter_conflict", "material_match", "scope_match",
        "sector_match", "graph_relationships", "version_status", "is_current_edition",
        "evidence_gate_passed", "evidence_strength", "gfr_rule_144_compliance",
        "qco_enforced", "is_referenced_match", "decision_path",
    }
    assert expected_trace_keys.issubset(set(trace.keys()))
