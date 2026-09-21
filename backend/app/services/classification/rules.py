"""Applicability classification (ai-pipeline.md §3.5): deterministic rule gate.

A real LLM can *propose* a class, but the rule gate here is authoritative: it
maps requirement type + retrieval signals to a controlled ApplicabilityClass,
caps confidence by evidence, and never lets a weakly-matched candidate be labelled
DIRECTLY_APPLICABLE. Keyless and unit-tested.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import ApplicabilityClass as AC
from app.models.enums import Confidence


@dataclass
class Classification:
    applicability_class: str
    confidence: str
    rationale: str
    excluded: bool = False
    exclusion_reason: str = ""


_TYPE_TO_CLASS = {
    "TESTING": AC.TESTING, "SAFETY": AC.SAFETY, "MATERIAL": AC.MATERIAL,
    "CERTIFICATION": AC.CERTIFICATION, "INSTALLATION": AC.INSTALLATION,
}


def classify(requirement_type: str, signals: dict, relevance: str, *, is_referenced_match: bool,
             has_evidence: bool) -> Classification:
    product = signals.get("product_match", 0.0)
    scope = signals.get("scope_match", 0.0)
    param = signals.get("parameter_match", 0.0)

    # 1) Explicit reference in the tender → directly applicable (strongest signal).
    if is_referenced_match:
        return Classification(AC.DIRECTLY_APPLICABLE.value, _cap(Confidence.HIGH, has_evidence),
                              "The tender explicitly references this standard number.")

    # 2) Requirement type maps to a relationship class.
    if requirement_type in _TYPE_TO_CLASS:
        cls = _TYPE_TO_CLASS[requirement_type].value
        return Classification(cls, _cap(_conf_from(relevance), has_evidence),
                              _reason(cls, signals))

    # 3) Technical requirement (parameter/dimension/performance/product).
    if product >= 1.0 and (scope >= 0.3 or param >= 1.0):
        return Classification(AC.DIRECTLY_APPLICABLE.value, _cap(_conf_from(relevance), has_evidence),
                              _reason(AC.DIRECTLY_APPLICABLE.value, signals))
    if relevance in ("HIGH", "MEDIUM"):
        return Classification(AC.RELATED.value, _cap(Confidence.LOW, has_evidence),
                              _reason(AC.RELATED.value, signals))

    # 4) Too weak → excluded with a mechanical reason ("why not").
    reason = _weakest(signals)
    return Classification(AC.NOT_APPLICABLE.value, Confidence.LOW.value, _reason(AC.NOT_APPLICABLE.value, signals),
                          excluded=True, exclusion_reason=reason)


def _conf_from(relevance: str) -> Confidence:
    return {"HIGH": Confidence.HIGH, "MEDIUM": Confidence.MEDIUM}.get(relevance, Confidence.LOW)


def _cap(conf: Confidence, has_evidence: bool) -> str:
    # No evidence → cannot exceed LOW (evidence-model.md §4).
    if not has_evidence:
        return Confidence.LOW.value
    return conf.value


def _reason(cls: str, signals: dict) -> str:
    parts = []
    if signals.get("product_match"):
        parts.append("product match")
    if signals.get("scope_match", 0) >= 0.3:
        parts.append("scope match")
    if signals.get("parameter_match"):
        parts.append("parameter match")
    if signals.get("material_match"):
        parts.append("material match")
    if signals.get("sector_match"):
        parts.append("sector match")
    basis = ", ".join(parts) or "weak lexical/semantic similarity only"
    return f"Classified {cls} based on {basis}."


def _weakest(signals: dict) -> str:
    if not signals.get("product_match"):
        return "product mismatch (standard's product categories not found in the requirement)"
    if signals.get("scope_match", 0) < 0.3:
        return "scope mismatch (little overlap with the standard's scope)"
    if not signals.get("parameter_match"):
        return "parameter mismatch"
    return "weaker evidence than higher-ranked candidates"
