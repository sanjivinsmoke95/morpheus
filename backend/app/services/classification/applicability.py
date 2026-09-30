"""Applicability Intelligence Engine (Phase 1, 6, 7, 9).

Dedicated, evidence-gated semantic decision layer for procurement standards:
(requirement, candidate_standard)
        ↓
semantic similarity + product/domain compatibility + sector compatibility
        + parameter compatibility + standard scope/title metadata
        + graph relationships + version/status + evidence
        ↓
applicability decision
        ↓
evidence gate
        ↓
human review if necessary

Classifies candidates into:
- DIRECTLY_APPLICABLE
- CONDITIONAL
- TESTING
- RELATED
- NOT_APPLICABLE
- REVIEW_REQUIRED

Uses interpretable evidence strength:
- HIGH
- MEDIUM
- LOW
- REVIEW_REQUIRED

Never uses fake probability percentages. Every recommendation is grounded in
retrieved evidence and structured WHY / WHY_NOT factors.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.models.enums import ApplicabilityClass as AC
from app.models.enums import Confidence, EvidenceStrength as ES

logger = logging.getLogger(__name__)


class EvidenceStrengthStr(str):
    """String subclass that treats canonical EvidenceStrength and legacy Confidence as equivalent."""
    def __eq__(self, other: Any) -> bool:
        if super().__eq__(other):
            return True
        pairs = {
            ("STRONG", "HIGH"), ("HIGH", "STRONG"),
            ("SUPPORTED", "MEDIUM"), ("MEDIUM", "SUPPORTED"),
            ("WEAK", "LOW"), ("LOW", "WEAK"),
            ("NO_EVIDENCE", "LOW"), ("LOW", "NO_EVIDENCE"),
            ("NO_EVIDENCE", "REVIEW_REQUIRED"), ("REVIEW_REQUIRED", "NO_EVIDENCE"),
        }
        return (str(self), str(other)) in pairs or (str(other), str(self)) in pairs

    def __hash__(self) -> int:
        return super().__hash__()


@dataclass
class ApplicabilityDecision:
    applicability_class: str
    evidence_strength: str                  # STRONG | SUPPORTED | WEAK | NO_EVIDENCE | REVIEW_REQUIRED
    rationale: str
    why: list[dict[str, Any]] = field(default_factory=list)
    why_not: list[dict[str, Any]] = field(default_factory=list)
    excluded: bool = False
    exclusion_reason: str = ""
    graph_support: str = ""
    qco_enforced: bool = False
    certification_required: str = ""
    requires_officer_review: bool = False
    decision_trace: dict[str, Any] = field(default_factory=dict)

    @property
    def confidence(self) -> str:
        """Compatibility property for legacy callers expecting .confidence."""
        return self.evidence_strength


def evaluate_applicability(
    *,
    requirement_type: str,
    requirement_desc: str,
    requirement_attributes: list[dict[str, Any]],
    candidate_standard: Any,               # Standard model instance
    signals: dict[str, Any],
    relevance: str,
    matched_chunk: str = "",
    product_profile: dict[str, Any] | None = None,
    analysis_sector: str = "",
    graph_relationships: list[dict[str, Any]] | None = None,
    version_records: list[dict[str, Any]] | None = None,
    qco_records: list[dict[str, Any]] | None = None,
    cert_records: list[dict[str, Any]] | None = None,
    is_referenced_match: bool = False,
    has_tender_evidence: bool = True,
    has_standard_evidence: bool = True,
) -> ApplicabilityDecision:
    """Evaluate applicability of a candidate standard against a specific requirement."""
    q_desc_low = (requirement_desc or "").lower()
    s = signals or {}
    product_match = float(s.get("product_match", 0.0))
    scope_match = float(s.get("scope_match", 0.0))
    param_match = float(s.get("parameter_match", 0.0))
    material_match = float(s.get("material_match", 0.0))
    sector_match = float(s.get("sector_match", 0.0))
    semantic_sim = float(s.get("semantic", 0.0))
    lexical_sim = float(s.get("lexical", 0.0))

    std_num = getattr(candidate_standard, "is_number", "")
    std_title = getattr(candidate_standard, "title", "")
    std_status = (getattr(candidate_standard, "status", "") or "ACTIVE").upper()
    std_categories = [p.lower() for p in (getattr(candidate_standard, "product_categories", []) or [])]
    std_scope = getattr(candidate_standard, "scope", "") or ""

    why: list[dict[str, Any]] = []
    why_not: list[dict[str, Any]] = []

    # ── 1. EVIDENCE GATE (Phase 1 & Phase 9) ───────────────────────────────
    # If the standard has no textual evidence in the database or the tender clause
    # has no extracted text, the system must ABSTAIN with REVIEW_REQUIRED.
    if not has_tender_evidence or not has_standard_evidence or not (matched_chunk or std_scope) or candidate_standard is None:
        why_not.append({
            "reason": "Evidence insufficient",
            "detail": "No verifiable clause or scope chunk retrieved for this standard in the local database.",
            "severity": "CRITICAL",
            "recommendation": "Officer must verify authoritative standard text before adopting.",
        })
        trace = {
            "evidence_gate_passed": False,
            "evidence_strength": ES.NO_EVIDENCE.value,
            "gate_reason": "No verifiable clause or scope chunk in database.",
        }
        return ApplicabilityDecision(
            applicability_class=AC.REVIEW_REQUIRED.value,
            evidence_strength=EvidenceStrengthStr(ES.NO_EVIDENCE.value),
            rationale="Evidence gate triggered: Insufficient textual evidence in verified corpus to determine applicability automatically.",
            why=why,
            why_not=why_not,
            requires_officer_review=True,
            excluded=False,
            decision_trace=trace,
        )

    # ── 2. VERSION & AMENDMENT AUDIT ────────────────────────────────────────
    is_outdated = std_status in ("OUTDATED", "SUPERSEDED", "WITHDRAWN")
    newer_version_label = ""
    cited_superseded = False
    if version_records:
        for vr in version_records:
            v_label = vr.get("version_label", "")
            if v_label and v_label in requirement_desc and not vr.get("is_current"):
                cited_superseded = True
            if vr.get("is_current") and v_label != getattr(candidate_standard, "current_version", ""):
                newer_version_label = v_label

    if is_outdated or newer_version_label or cited_superseded:
        is_outdated = True
        why_not.append({
            "reason": "Standard edition superseded or outdated",
            "detail": f"Standard {std_num} is marked as {std_status} or specification cites an older version." + (f" Current edition is {getattr(candidate_standard, 'current_version', '')}." if getattr(candidate_standard, 'current_version', '') else ""),
            "severity": "WARNING",
            "recommendation": "GFR 2017 Rule 144(i) requires current standards. Update reference to current edition.",
        })

    # ── 3. QCO & REGULATORY ENFORCEMENT SIGNALS ─────────────────────────────
    is_qco_mandatory = False
    qco_title = ""
    if qco_records:
        for q in qco_records:
            if q.get("qco_status") == "MANDATORY":
                is_qco_mandatory = True
                qco_title = q.get("order_name") or "Mandatory Quality Control Order"
                why.append({
                    "factor": "Mandatory Quality Control Order (QCO)",
                    "detail": f"Enforced under BIS Act 2016 ({qco_title}). Standard compliance is legally mandatory for domestic and imported goods.",
                    "signal": "qco_order",
                    "strength": "HIGH",
                })
                break

    cert_scheme = ""
    if cert_records:
        for cr in cert_records:
            scheme = cr.get("scheme") or "ISI"
            cert_scheme = scheme
            why.append({
                "factor": f"Statutory Certification Scheme ({scheme})",
                "detail": f"Product requires {scheme} certification mark as per statutory order. Requirement: {cr.get('requirement', 'Mandatory conformity')}.",
                "signal": "certification",
                "strength": "HIGH",
            })
            break

    # ── 4. KNOWLEDGE GRAPH RELATIONSHIP SIGNALS (Phase 6) ───────────────────
    has_testing_rel = False
    has_material_rel = False
    has_safety_rel = False
    has_normative_rel = False
    graph_notes: list[str] = []

    if graph_relationships:
        for rel in graph_relationships:
            rtype = rel.get("relationship_type", "")
            target_num = rel.get("target_is_number", "")
            note = rel.get("note", "")
            if rtype == "TESTING":
                has_testing_rel = True
                why.append({
                    "factor": "Testing standard relationship (Knowledge Graph)",
                    "detail": f"Connected to {target_num} as an authoritative test method / routine test standard. {note}".strip(),
                    "signal": "graph_relationship",
                    "strength": "HIGH",
                })
                graph_notes.append(f"Testing standard for {target_num}")
            elif rtype == "MATERIAL":
                has_material_rel = True
                why.append({
                    "factor": "Material standard relationship (Knowledge Graph)",
                    "detail": f"Connected to {target_num} as an approved material specification. {note}".strip(),
                    "signal": "graph_relationship",
                    "strength": "HIGH",
                })
                graph_notes.append(f"Material specification for {target_num}")
            elif rtype == "SAFETY":
                has_safety_rel = True
                why.append({
                    "factor": "Safety requirement relationship (Knowledge Graph)",
                    "detail": f"Connected to {target_num} as a mandatory safety code. {note}".strip(),
                    "signal": "graph_relationship",
                    "strength": "HIGH",
                })
                graph_notes.append(f"Safety standard for {target_num}")
            elif rtype in ("NORMATIVE_REFERENCE", "REFERENCES"):
                has_normative_rel = True
                why.append({
                    "factor": "Normative reference (Knowledge Graph)",
                    "detail": f"Cited normatively by {target_num}. {note}".strip(),
                    "signal": "graph_relationship",
                    "strength": "MEDIUM",
                })
                graph_notes.append(f"Normatively cited by {target_num}")

    # ── 5. CORE MATCHING FACTORS (WHY IT MATCHES) ───────────────────────────
    if is_referenced_match:
        why.append({
            "factor": "Explicit tender citation",
            "detail": f"The tender specification explicitly references standard number {std_num}.",
            "signal": "referenced_standard",
            "strength": "HIGH",
        })

    if product_match >= 0.70:
        matching_cats = [c for c in std_categories if c in requirement_desc.lower()]
        cat_str = ", ".join(matching_cats) or "Product category"
        why.append({
            "factor": "Product category matches",
            "detail": f"The standard's designated product category ({cat_str}) directly matches the tender requirement.",
            "signal": "product_match",
            "strength": "HIGH",
        })

    if sector_match >= 1.0 or (analysis_sector and getattr(candidate_standard, "sector", "") == analysis_sector):
        why.append({
            "factor": "Procurement sector matches",
            "detail": f"Both the tender and the standard belong to the '{analysis_sector or getattr(candidate_standard, 'sector', '')}' sector.",
            "signal": "sector_match",
            "strength": "MEDIUM",
        })

    if param_match >= 1.0:
        matched_keys = [a.get("key", "") for a in requirement_attributes if a.get("key") and a.get("key").lower() in (std_scope + " " + std_title).lower()]
        param_str = ", ".join(matched_keys) if matched_keys else "Key parameters"
        why.append({
            "factor": "Requirement parameters match standard scope",
            "detail": f"Specified technical parameters ({param_str}) are covered in the standard's scope.",
            "signal": "parameter_match",
            "strength": "HIGH",
        })

    if material_match >= 1.0:
        why.append({
            "factor": "Construction material matches",
            "detail": "Specified construction materials (e.g. cast iron, steel, copper) are covered in the standard.",
            "signal": "material_match",
            "strength": "MEDIUM",
        })

    if scope_match >= 0.3:
        why.append({
            "factor": "Functional scope overlap",
            "detail": f"Document text demonstrates {int(scope_match * 100)}% functional keyword alignment with the standard's defined scope.",
            "signal": "scope_match",
            "strength": "MEDIUM",
        })

    if semantic_sim >= 0.55:
        why.append({
            "factor": "High semantic similarity",
            "detail": f"Dense vector embedding similarity score of {round(semantic_sim, 2)} confirms deep semantic alignment.",
            "signal": "semantic_similarity",
            "strength": "HIGH",
        })
    elif lexical_sim >= 0.50:
        why.append({
            "factor": "Strong keyword overlap (BM25)",
            "detail": f"Lexical retrieval score of {round(lexical_sim, 2)} indicates strong technical term co-occurrence.",
            "signal": "lexical_similarity",
            "strength": "MEDIUM",
        })

    if not is_outdated:
        why.append({
            "factor": "Current active version",
            "detail": f"Standard edition ({std_num}) is currently in force and actively published by BIS.",
            "signal": "version_status",
            "strength": "HIGH",
        })

    # ── 6. LIMITATIONS / WHY NOT (RISKS & MISSING SIGNALS) ───────────────────
    if product_match == 0.0 and not is_referenced_match:
        why_not.append({
            "reason": "Product category not explicitly named",
            "detail": "The standard's primary product category does not explicitly appear in the requirement text.",
            "severity": "WARNING",
            "recommendation": "Verify whether this standard is intended as a general material/installation reference.",
        })

    if param_match == 0.0 and requirement_attributes:
        why_not.append({
            "reason": "Specific parameter values not confirmed in scope excerpt",
            "detail": "Numerical parameter ratings (e.g. pressure, voltage, capacity) require manual clause verification against detailed tables.",
            "severity": "INFO",
            "recommendation": "Confirm exact rating class against BIS clause tables.",
        })

    if scope_match < 0.25 and not is_referenced_match:
        why_not.append({
            "reason": "Low textual scope overlap",
            "detail": f"Scope overlap is {int(scope_match * 100)}%, indicating potential tangential relevance.",
            "severity": "WARNING",
            "recommendation": "Review standard title and scope to verify applicability.",
        })

    if cert_scheme and not any(k in requirement_desc.lower() for k in ("isi", "bis", "certification", "cert")):
        why_not.append({
            "reason": "Statutory certification not stated in tender",
            "detail": f"This product standard is governed by {cert_scheme} certification, but the tender text does not specify the certification mark.",
            "severity": "WARNING",
            "recommendation": f"Add explicit mandatory requirement for {cert_scheme} mark in tender to avoid regulatory non-compliance.",
        })

    # ── 7. DECISION CLASSIFICATION LOGIC ────────────────────────────────────
    # Baseline evidence quality assessment
    # Baseline evidence quality assessment
    if s.get("product_conflict") and not is_referenced_match:
        base_evidence = EvidenceStrengthStr(ES.WEAK.value)
    elif is_qco_mandatory or is_referenced_match or (product_match >= 0.70 and scope_match >= 0.25 and (param_match >= 1.0 or material_match >= 1.0 or semantic_sim >= 0.50)):
        base_evidence = EvidenceStrengthStr(ES.STRONG.value)
    elif product_match >= 0.70 or scope_match >= 0.30 or param_match >= 1.0 or has_testing_rel or has_material_rel or has_safety_rel:
        base_evidence = EvidenceStrengthStr(ES.SUPPORTED.value)
    else:
        base_evidence = EvidenceStrengthStr(ES.WEAK.value)

    applicability_class = AC.RELATED.value
    evidence_strength = base_evidence
    excluded = False
    exclusion_reason = ""
    decision_path = "DEFAULT_RELATED"

    # Decision Path A: Explicit Citation in Tender
    if is_referenced_match:
        decision_path = "EXPLICIT_CITATION"
        if is_outdated:
            applicability_class = AC.CONDITIONAL.value
            evidence_strength = EvidenceStrengthStr(ES.SUPPORTED.value)
            rationale = f"Referenced in tender, but standard {std_num} is {std_status}. Officer review required to update to current edition."
        else:
            applicability_class = AC.DIRECTLY_APPLICABLE.value
            evidence_strength = EvidenceStrengthStr(ES.STRONG.value)
            rationale = f"Directly applicable: Explicitly referenced by standard number in the specification ({std_num}) and edition is active."

    # Decision Path B: Requirement Type is explicitly TESTING or connected via TESTING graph relationship
    elif requirement_type in ("TESTING", "testing_and_inspection", "testing") or has_testing_rel:
        decision_path = "TESTING_METHOD"
        applicability_class = AC.TESTING.value
        evidence_strength = EvidenceStrengthStr(ES.STRONG.value if (has_testing_rel or product_match >= 1.0 or scope_match >= 0.3) else ES.SUPPORTED.value)
        rationale = f"Testing applicability: Standard defines test methods, acceptance criteria, or routine testing procedures for this requirement."

    # Decision Path C: Core Product / Parameter Specification
    elif (product_match >= 0.70 and (scope_match >= 0.25 or param_match >= 0.70 or is_qco_mandatory)) or (product_match >= 0.70 and semantic_sim >= 0.50):
        decision_path = "PRODUCT_SPECIFICATION"
        if is_outdated:
            applicability_class = AC.CONDITIONAL.value
            evidence_strength = EvidenceStrengthStr(ES.SUPPORTED.value)
            rationale = f"Conditional: Standard matches product and parameters, but edition is {std_status}."
        elif is_qco_mandatory:
            applicability_class = AC.DIRECTLY_APPLICABLE.value
            evidence_strength = EvidenceStrengthStr(ES.STRONG.value)
            rationale = f"Directly applicable: Mandatory under Government Quality Control Order ({qco_title}) and matches product specification."
        else:
            applicability_class = AC.DIRECTLY_APPLICABLE.value
            evidence_strength = EvidenceStrengthStr(ES.STRONG.value if (param_match >= 1.0 and scope_match >= 0.3) else ES.SUPPORTED.value)
            rationale = f"Directly applicable: High product and scope alignment ({std_num} - {std_title})."

    # Decision Path D: Material or Safety Requirements
    elif requirement_type in ("MATERIAL", "material") or has_material_rel or ((material_match >= 1.0 or any(k in std_title.lower() for k in ("specification for grey iron", "structural steel", "raw material", "insulating oil"))) and product_match < 0.70):
        decision_path = "MATERIAL_SPECIFICATION"
        applicability_class = AC.MATERIAL.value
        evidence_strength = EvidenceStrengthStr(ES.STRONG.value if (has_material_rel or material_match >= 1.0) else ES.SUPPORTED.value)
        rationale = f"Material applicability: Standard specifies raw material composition, grades, or mechanical properties required."

    elif requirement_type in ("SAFETY", "safety") or has_safety_rel or ("safety" in std_title.lower() and product_match < 0.70):
        decision_path = "SAFETY_CODE"
        applicability_class = AC.SAFETY.value
        evidence_strength = EvidenceStrengthStr(ES.STRONG.value if (has_safety_rel or scope_match >= 0.3) else ES.SUPPORTED.value)
        rationale = f"Safety applicability: Standard defines mandatory protective, earthing, or insulation safety codes."

    elif (any(k in std_title.lower() for k in ("methods of test", "testing", "tests for", "acceptance test"))) and any(k in q_desc_low for k in ("test", "tested", "testing", "inspection", "performance")) and product_match < 0.70:
        decision_path = "TESTING_METHOD"
        applicability_class = AC.TESTING.value
        evidence_strength = EvidenceStrengthStr(ES.SUPPORTED.value)
        rationale = f"Testing applicability: Standard defines test methods or testing procedures for this requirement."

    # Decision Path D: Conditional Applicability
    elif (product_match >= 1.0 or scope_match >= 0.4) and (relevance in ("HIGH", "MEDIUM") or semantic_sim >= 0.45):
        decision_path = "CONDITIONAL_APPLICATION"
        applicability_class = AC.CONDITIONAL.value
        evidence_strength = EvidenceStrengthStr(ES.SUPPORTED.value)
        rationale = f"Conditional applicability: Substantive overlap with tender requirements, subject to capacity/application rating verification."

    # Decision Path E: Related / Informational Standards
    elif relevance in ("HIGH", "MEDIUM") or has_normative_rel or (scope_match >= 0.25 and sector_match >= 1.0) or material_match >= 1.0:
        decision_path = "RELATED_STANDARD"
        applicability_class = AC.RELATED.value
        evidence_strength = EvidenceStrengthStr(ES.SUPPORTED.value if material_match >= 1.0 else ES.WEAK.value)
        rationale = f"Related standard: Applicable as an associated code of practice, material/installation guide, or normative cross-reference."

    # Decision Path F: Weak / Not Applicable (Excluded)
    else:
        decision_path = "NOT_APPLICABLE"
        applicability_class = AC.NOT_APPLICABLE.value
        evidence_strength = EvidenceStrengthStr(ES.WEAK.value)
        excluded = True
        if sector_match == 0.0 and analysis_sector and getattr(candidate_standard, "sector", "") != analysis_sector and material_match == 0.0:
            exclusion_reason = f"Sector mismatch (tender sector '{analysis_sector}' vs standard sector '{getattr(candidate_standard, 'sector', '')}')"
        elif s.get("product_conflict"):
            exclusion_reason = "Product domain conflict (candidate standard belongs to a mutually exclusive product category)"
        elif product_match == 0.0 and material_match == 0.0:
            exclusion_reason = "Product mismatch (standard's designated product categories not found in requirement)"
        elif scope_match < 0.25:
            exclusion_reason = "Scope mismatch (insufficient technical overlap with standard scope)"
        else:
            exclusion_reason = "Weaker overall evidence than higher-ranked candidate standards"

        rationale = f"Not applicable: Candidate standard disqualified due to {exclusion_reason}."
        why_not.insert(0, {
            "reason": "Candidate disqualified",
            "detail": exclusion_reason,
            "severity": "CRITICAL",
            "recommendation": "Excluded from primary recommendations.",
        })

    # ── 8. EVIDENCE GATE: STRICT VERIFICATION FOR DIRECT APPLICABILITY ──────
    # A candidate standard CANNOT be DIRECTLY_APPLICABLE if evidence is WEAK or NO_EVIDENCE.
    # High retrieval scores (e.g. general lexical overlap) alone cannot bypass this gate.
    if applicability_class == AC.DIRECTLY_APPLICABLE.value and evidence_strength == ES.WEAK.value:
        if is_referenced_match:
            applicability_class = AC.CONDITIONAL.value
            evidence_strength = EvidenceStrengthStr(ES.SUPPORTED.value)
            rationale = f"Conditional: Referenced in tender, but evidence quality is weak (insufficient verified product or scope alignment in corpus). Officer review required."
        else:
            applicability_class = AC.REVIEW_REQUIRED.value
            evidence_strength = EvidenceStrengthStr(ES.REVIEW_REQUIRED.value)
            decision_path = "DEMOTED_BY_EVIDENCE_GATE"
            rationale = f"Evidence gate triggered: Candidate standard achieved retrieval signals, but evidence is WEAK (no verified product category or scope overlap). Demoted to human review."
            why_not.insert(0, {
                "reason": "Evidence gate triggered",
                "detail": "Lexical or generic retrieval match without verified product category or scope support. High retrieval score alone cannot produce DIRECTLY_APPLICABLE.",
                "severity": "CRITICAL",
                "recommendation": "Officer must verify whether this standard actually governs this item.",
            })

    decision_trace = {
        "evidence_gate_passed": evidence_strength in (ES.STRONG.value, ES.SUPPORTED.value),
        "evidence_strength": str(evidence_strength),
        "product_match": product_match,
        "product_conflict": s.get("product_conflict", False),
        "scope_match": scope_match,
        "parameter_match": param_match,
        "qco_enforced": is_qco_mandatory,
        "is_referenced_match": is_referenced_match,
        "decision_path": decision_path,
    }

    return ApplicabilityDecision(
        applicability_class=applicability_class,
        evidence_strength=evidence_strength,
        rationale=rationale,
        why=why,
        why_not=why_not,
        excluded=excluded,
        exclusion_reason=exclusion_reason,
        graph_support=", ".join(graph_notes) if graph_notes else "",
        qco_enforced=is_qco_mandatory,
        certification_required=cert_scheme,
        requires_officer_review=(applicability_class in (AC.REVIEW_REQUIRED.value, AC.CONDITIONAL.value) or is_outdated),
        decision_trace=decision_trace,
    )
