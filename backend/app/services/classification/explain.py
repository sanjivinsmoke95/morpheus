"""Why / Why-not explanations (mission Phase 7).

Turns the real retrieval + classification signals into concise, user-facing
factors. Every factor maps to an actual system signal — nothing is invented. The
same signal set drives 'why it applies' and 'why an alternative was not selected'.
"""

from __future__ import annotations


def build_why(signals: dict, applicability_class: str, relevance: str,
              version_status: str | None = None, graph_info: str | None = None) -> list[dict]:
    """Positive factors supporting a recommendation. Each: {factor, detail}."""
    s = signals or {}
    # If the applicability engine already populated structured why items, return them.
    if s.get("why") and isinstance(s["why"], list) and len(s["why"]) > 0:
        return s["why"]

    out: list[dict] = []
    if s.get("referenced_match"):
        out.append({"factor": "Explicit tender citation", "detail": "The tender explicitly references this standard number."})
    if s.get("product_match"):
        out.append({"factor": "Product category matches", "detail": "The standard's product category matches the requirement specification."})
    if s.get("parameter_match"):
        out.append({"factor": "Parameter requirement matches", "detail": "Specified technical parameter (voltage/capacity/head/pressure) is covered by the standard."})
    if s.get("scope_match", 0) >= 0.3:
        out.append({"factor": "Functional scope matches", "detail": "The requirement text directly overlaps the standard's stated functional scope."})
    if s.get("material_match"):
        out.append({"factor": "Material specification matches", "detail": "A material named in the requirement (e.g. cast iron, steel, copper) is covered."})
    if s.get("sector_match"):
        out.append({"factor": "Procurement sector matches", "detail": "The tender sector matches the standard's designated sector."})
    if s.get("graph_support") or graph_info:
        detail = s.get("graph_support") or graph_info
        out.append({"factor": "Knowledge Graph relationship", "detail": f"Inter-standard graph link: {detail}."})
    if s.get("qco_enforced"):
        out.append({"factor": "Mandatory Quality Control Order (QCO)", "detail": "Enforced under BIS Act 2016. Compliance is mandatory for government procurement."})
    if s.get("semantic", 0) >= 0.5:
        out.append({"factor": "Semantic similarity", "detail": f"Dense vector embedding similarity score ({round(s.get('semantic', 0), 2)}) confirms semantic alignment."})
    elif s.get("lexical", 0) >= 0.5:
        out.append({"factor": "Strong keyword match (BM25)", "detail": "High lexical overlap with the requirement text."})
    if applicability_class == "DIRECTLY_APPLICABLE":
        out.append({"factor": "Directly applicable", "detail": "Classified as directly applicable product standard by the applicability engine."})
    elif applicability_class == "TESTING":
        out.append({"factor": "Testing standard", "detail": "Standard defines mandatory test methods and acceptance procedures for this product."})
    elif applicability_class == "CONDITIONAL":
        out.append({"factor": "Conditional applicability", "detail": "Applicable subject to specific parameter or capacity threshold verification."})
    elif applicability_class == "MATERIAL":
        out.append({"factor": "Material specification", "detail": "Standard governs the composition and mechanical properties of components."})
    if version_status == "CURRENT":
        out.append({"factor": "Current active version", "detail": "The standard edition is current, active, and verified in the catalogue."})
    return out


def build_why_not(signals: dict, exclusion_reason: str, version_status: str | None = None) -> list[dict]:
    """Reasons an alternative was not selected or limitations on an included standard."""
    s = signals or {}
    # If the applicability engine already populated structured why_not items, return them.
    if s.get("why_not") and isinstance(s["why_not"], list) and len(s["why_not"]) > 0:
        return s["why_not"]

    out: list[dict] = []
    if version_status in ("OUTDATED", "SUPERSEDED"):
        out.append({"reason": "Superseded / outdated edition", "detail": "A newer edition of this standard exists. GFR Rule 144(i) requires current standards."})
    elif version_status == "WITHDRAWN":
        out.append({"reason": "Withdrawn standard", "detail": "This standard has been formally withdrawn by the Bureau of Indian Standards."})

    if not s.get("product_match"):
        out.append({"reason": "Product mismatch", "detail": "The standard's designated product category was not found in the requirement."})
    if s.get("scope_match", 0) < 0.25:
        out.append({"reason": "Scope mismatch", "detail": "Little textual or functional overlap with the standard's scope."})
    if not s.get("parameter_match"):
        out.append({"reason": "Parameter mismatch", "detail": "No specified parameter values were matched directly in the standard excerpt."})
    if not out and exclusion_reason:
        out.append({"reason": "Weaker evidence", "detail": exclusion_reason})
    return out

