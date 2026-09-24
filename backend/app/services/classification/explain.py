"""Why / Why-not explanations (mission Phase 7).

Turns the real retrieval + classification signals into concise, user-facing
factors. Every factor maps to an actual system signal — nothing is invented. The
same signal set drives 'why it applies' and 'why an alternative was not selected'.
"""

from __future__ import annotations


def build_why(signals: dict, applicability_class: str, relevance: str,
              version_status: str | None = None) -> list[dict]:
    """Positive factors supporting a recommendation. Each: {factor, detail}."""
    s = signals or {}
    out: list[dict] = []
    if s.get("product_match"):
        out.append({"factor": "Product category matches", "detail": "The standard's product category appears in the requirement."})
    if s.get("parameter_match"):
        out.append({"factor": "Parameter requirement matches", "detail": "A specified parameter (voltage/capacity/…) is covered by the standard."})
    if s.get("scope_match", 0) >= 0.3:
        out.append({"factor": "Scope matches", "detail": "The requirement overlaps the standard's stated scope."})
    if s.get("material_match"):
        out.append({"factor": "Material matches", "detail": "A material named in the requirement is covered."})
    if s.get("sector_match"):
        out.append({"factor": "Sector matches", "detail": "The tender sector matches the standard's sector."})
    if s.get("semantic", 0) >= 0.5:
        out.append({"factor": "Semantic similarity", "detail": "Strong meaning-level similarity (semantic model enabled)."})
    elif s.get("lexical", 0) >= 0.6:
        out.append({"factor": "Strong keyword match", "detail": "High lexical (BM25) overlap with the requirement."})
    if applicability_class == "DIRECTLY_APPLICABLE":
        out.append({"factor": "Directly applicable", "detail": "Classified as directly applicable by the rule gate."})
    if applicability_class == "TESTING":
        out.append({"factor": "Testing relationship", "detail": "The standard defines a test method for this requirement."})
    if version_status == "CURRENT":
        out.append({"factor": "Current version", "detail": "The referenced/latest edition is current."})
    return out


def build_why_not(signals: dict, exclusion_reason: str, version_status: str | None = None) -> list[dict]:
    """Reasons an alternative was not selected. Each: {reason, detail}."""
    s = signals or {}
    out: list[dict] = []
    if version_status in ("OUTDATED", "SUPERSEDED"):
        out.append({"reason": "Superseded / outdated", "detail": "A newer edition of this standard exists."})
    if not s.get("product_match"):
        out.append({"reason": "Product mismatch", "detail": "The standard's product category was not found in the requirement."})
    if s.get("scope_match", 0) < 0.3:
        out.append({"reason": "Scope mismatch", "detail": "Little overlap with the standard's scope."})
    if not s.get("parameter_match"):
        out.append({"reason": "Parameter mismatch", "detail": "No specified parameter was matched."})
    if not out and exclusion_reason:
        out.append({"reason": "Weaker evidence", "detail": exclusion_reason})
    return out
