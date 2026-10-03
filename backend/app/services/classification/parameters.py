"""Normalized technical parameter compatibility engine (Phase 8 & Part 4).

Compares requirement attributes against standard scopes and metadata safely:
- Exact numeric match
- Range compatibility (e.g. 25–250 kVA vs 100 kVA)
- Threshold / upper-limit compatibility (e.g. up to 2500 kVA vs 500 kVA)
- Incompatible values / threshold exceeded (e.g. 10 bar vs 6 bar maximum)
- Safe unit conversions (kV -> V, MVA -> kVA, MPa -> bar, HP -> kW)
- Never fabricates unstated parameter constraints (marks UNKNOWN / REVIEW_REQUIRED)
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

# Regex tokenizers for parameter value and unit extraction
_NUM_RE = re.compile(r"[-+]?(?:\d*\.\d+|\d+)")
_UNIT_RE = re.compile(r"\b(kva|mva|va|kv|v|bar|mpa|kpa|pa|kw|mw|hp|w|hz|khz|m3/h|lpm|lps|rpm|deg|c|mm|cm|m)\b", re.IGNORECASE)

# Standardized conversion factors to canonical base units
# Voltages -> V
# Apparent Power -> kVA
# Active Power -> kW
# Pressure -> bar
# Frequency -> Hz
CONVERSIONS: dict[str, tuple[str, float]] = {
    # Voltage (base: V)
    "v": ("V", 1.0),
    "volt": ("V", 1.0),
    "volts": ("V", 1.0),
    "kv": ("V", 1000.0),
    "kilovolt": ("V", 1000.0),
    "mv": ("V", 0.001),

    # Apparent power (base: kVA)
    "kva": ("kVA", 1.0),
    "va": ("kVA", 0.001),
    "mva": ("kVA", 1000.0),

    # Active power (base: kW)
    "kw": ("kW", 1.0),
    "kilowatt": ("kW", 1.0),
    "w": ("kW", 0.001),
    "watt": ("kW", 0.001),
    "mw": ("kW", 1000.0),
    "hp": ("kW", 0.7457),

    # Pressure (base: bar)
    "bar": ("bar", 1.0),
    "mpa": ("bar", 10.0),
    "kpa": ("bar", 0.01),
    "pa": ("bar", 0.00001),
    "kg/cm2": ("bar", 0.980665),
    "psi": ("bar", 0.0689476),

    # Frequency (base: Hz)
    "hz": ("Hz", 1.0),
    "khz": ("Hz", 1000.0),
}


@dataclass
class NormalizedParameter:
    key: str
    raw_value: str
    canonical_value: float | None
    canonical_unit: str
    comparator: str = "="
    value_high: float | None = None
    is_valid: bool = True


@dataclass
class ParameterCheckResult:
    key: str
    status: str  # "COMPATIBLE", "CONFLICT", "UNKNOWN", "NOT_SPECIFIED"
    match_type: str  # "EXACT_MATCH", "RANGE_MATCH", "THRESHOLD_MATCH", "THRESHOLD_EXCEEDED", "VALUE_MISMATCH", "NO_STANDARD_LIMIT", "MALFORMED_INPUT"
    score: float  # 1.0 (compatible), -1.0 (conflict), 0.0 (unknown/neutral)
    details: str
    tender_display: str
    standard_display: str


def normalize_parameter(
    key: str,
    raw_value: Any,
    unit: str = "",
    normalized_value: float | None = None,
    comparator: str = "=",
    value_high: float | None = None,
) -> NormalizedParameter:
    """Normalizes tender parameter to canonical base unit with safety checks."""
    key_clean = (key or "").strip().lower()
    raw_str = str(raw_value or "").strip()

    if not raw_str and normalized_value is None:
        return NormalizedParameter(key_clean, "", None, "", is_valid=False)

    # If normalized_value is already provided with known unit
    effective_unit = unit.lower().strip()
    if not effective_unit:
        u_match = _UNIT_RE.search(raw_str)
        if u_match:
            effective_unit = u_match.group(1).lower()

    if normalized_value is not None:
        try:
            num = float(normalized_value)
        except (ValueError, TypeError):
            return NormalizedParameter(key_clean, raw_str, None, effective_unit, is_valid=False)
    else:
        n_match = _NUM_RE.search(raw_str)
        if not n_match:
            return NormalizedParameter(key_clean, raw_str, None, effective_unit, is_valid=False)
        try:
            num = float(n_match.group(0))
        except (ValueError, TypeError):
            return NormalizedParameter(key_clean, raw_str, None, effective_unit, is_valid=False)

    canon_unit, factor = CONVERSIONS.get(effective_unit, (effective_unit.upper(), 1.0))
    canon_val = round(num * factor, 4)

    high_canon = None
    if value_high is not None:
        try:
            high_canon = round(float(value_high) * factor, 4)
        except (ValueError, TypeError):
            high_canon = None
    elif "to" in raw_str.lower() or "-" in raw_str:
        # Check range in raw string e.g. "25 to 250 kVA"
        nums = [float(x) for x in _NUM_RE.findall(raw_str)]
        if len(nums) >= 2:
            canon_val = round(min(nums) * factor, 4)
            high_canon = round(max(nums) * factor, 4)
            comparator = "range"

    return NormalizedParameter(
        key=key_clean,
        raw_value=raw_str,
        canonical_value=canon_val,
        canonical_unit=canon_unit,
        comparator=comparator,
        value_high=high_canon,
        is_valid=True,
    )


def extract_standard_constraints(param_key: str, std_text: str) -> dict[str, Any] | None:
    """Safely extracts legitimate numeric parameter limits from standard text.
    
    DOES NOT FABRICATE LIMITS: Returns None if no explicit numeric limit is stated.
    """
    if not std_text:
        return None

    text_low = std_text.lower()
    key_clean = param_key.lower().strip()

    # Identify parameter domain keywords
    relevant_units: list[str] = []
    if key_clean in ("voltage", "rated voltage", "supply voltage"):
        relevant_units = ["kv", "v"]
    elif key_clean in ("power", "capacity", "rated power", "rating", "kva"):
        relevant_units = ["kva", "mva", "va", "kw", "mw", "hp"]
    elif key_clean in ("pressure", "head", "operating pressure"):
        relevant_units = ["bar", "mpa", "kpa"]
    elif key_clean in ("frequency", "freq"):
        relevant_units = ["hz", "khz"]
    else:
        # General lookup based on keys
        relevant_units = list(CONVERSIONS.keys())

    # 1. Pattern: "up to [and including] X <unit>"
    up_to_pat = rf"(?:up\s+to(?:\s+and\s+including)?|maximum|max|not\s+exceeding)\s+({_NUM_RE.pattern})\s*({'|'.join(relevant_units)})\b"
    m_up = re.search(up_to_pat, text_low)
    if m_up:
        val = float(m_up.group(1))
        unit = m_up.group(2)
        c_unit, factor = CONVERSIONS.get(unit, (unit.upper(), 1.0))
        return {
            "type": "UPPER_BOUND",
            "max_value": val * factor,
            "canonical_unit": c_unit,
            "raw": m_up.group(0),
        }

    # 2. Pattern: "X <unit> maximum / max"
    post_max_pat = rf"({_NUM_RE.pattern})\s*({'|'.join(relevant_units)})\s*(?:maximum|max)\b"
    m_post = re.search(post_max_pat, text_low)
    if m_post:
        val = float(m_post.group(1))
        unit = m_post.group(2)
        c_unit, factor = CONVERSIONS.get(unit, (unit.upper(), 1.0))
        return {
            "type": "UPPER_BOUND",
            "max_value": val * factor,
            "canonical_unit": c_unit,
            "raw": m_post.group(0),
        }

    # 3. Pattern: "X to Y <unit>" or "X - Y <unit>"
    range_pat = rf"({_NUM_RE.pattern})\s*(?:to|-)\s*({_NUM_RE.pattern})\s*({'|'.join(relevant_units)})\b"
    m_range = re.search(range_pat, text_low)
    if m_range:
        v1, v2 = float(m_range.group(1)), float(m_range.group(2))
        unit = m_range.group(3)
        c_unit, factor = CONVERSIONS.get(unit, (unit.upper(), 1.0))
        return {
            "type": "RANGE",
            "min_value": min(v1, v2) * factor,
            "max_value": max(v1, v2) * factor,
            "canonical_unit": c_unit,
            "raw": m_range.group(0),
        }

    # 4. Pattern: Discrete stated rating, e.g., "11 kV", "415 V", "100 kVA"
    discrete_pat = rf"\b({_NUM_RE.pattern})\s*({'|'.join(relevant_units)})\b"
    matches = re.findall(discrete_pat, text_low)
    if matches:
        discrete_values = []
        c_unit = ""
        for v_str, u_str in matches:
            u_low = u_str.lower()
            cu, factor = CONVERSIONS.get(u_low, (u_low.upper(), 1.0))
            c_unit = cu
            discrete_values.append(float(v_str) * factor)
        return {
            "type": "DISCRETE_RATINGS",
            "values": discrete_values,
            "canonical_unit": c_unit,
            "raw": ", ".join(f"{v} {c_unit}" for v in discrete_values),
        }

    # If the text mentions the keyword (e.g. "voltage" or "pressure") without explicit numeric bounds
    if any(k in text_low for k in (key_clean, "parameter", "rating", "capacity", "operating")):
        return {
            "type": "UNSTRUCTURED_MENTION",
            "raw": f"Mentions {key_clean} without structured numeric limits",
        }

    return None


def evaluate_parameter_compatibility(
    param_key: str,
    tender_raw: Any,
    std_text: str,
    unit: str = "",
    normalized_value: float | None = None,
    comparator: str = "=",
    value_high: float | None = None,
) -> ParameterCheckResult:
    """Compares tender parameter against standard text and returns formal compatibility verdict."""
    norm = normalize_parameter(
        key=param_key,
        raw_value=tender_raw,
        unit=unit,
        normalized_value=normalized_value,
        comparator=comparator,
        value_high=value_high,
    )

    if not norm.is_valid or norm.canonical_value is None:
        return ParameterCheckResult(
            key=param_key,
            status="UNKNOWN",
            match_type="MALFORMED_INPUT",
            score=0.0,
            details=f"Malformed or missing parameter value for '{param_key}' ({tender_raw})",
            tender_display=str(tender_raw),
            standard_display="N/A",
        )

    t_val = norm.canonical_value
    t_unit = norm.canonical_unit
    t_disp = f"{t_val} {t_unit}" if norm.value_high is None else f"{t_val}–{norm.value_high} {t_unit}"

    std_constr = extract_standard_constraints(param_key, std_text)
    if not std_constr:
        return ParameterCheckResult(
            key=param_key,
            status="UNKNOWN",
            match_type="NO_STANDARD_LIMIT",
            score=0.0,
            details=f"Standard scope does not declare structured limits for '{param_key}'",
            tender_display=t_disp,
            standard_display="Not specified",
        )

    c_type = std_constr.get("type")
    s_unit = std_constr.get("canonical_unit", t_unit)

    # Unit safety check: If units cannot be converted (e.g. pressure vs voltage)
    if s_unit and t_unit and s_unit != t_unit:
        return ParameterCheckResult(
            key=param_key,
            status="UNKNOWN",
            match_type="INCOMPATIBLE_UNITS",
            score=0.0,
            details=f"Unit mismatch: tender uses {t_unit} while standard uses {s_unit}",
            tender_display=t_disp,
            standard_display=std_constr.get("raw", ""),
        )

    # Check 1: UPPER BOUND (e.g. "up to 2500 kVA", "up to 1100 V", "maximum 6 bar")
    if c_type == "UPPER_BOUND":
        max_val = std_constr["max_value"]
        s_disp = f"up to {max_val} {s_unit}"
        if t_val <= max_val:
            return ParameterCheckResult(
                key=param_key,
                status="COMPATIBLE",
                match_type="THRESHOLD_MATCH",
                score=1.0,
                details=f"Tender {t_disp} is within standard limit ({s_disp})",
                tender_display=t_disp,
                standard_display=s_disp,
            )
        else:
            return ParameterCheckResult(
                key=param_key,
                status="CONFLICT",
                match_type="THRESHOLD_EXCEEDED",
                score=-1.0,
                details=f"Tender {t_disp} exceeds standard maximum limit of {max_val} {s_unit}",
                tender_display=t_disp,
                standard_display=s_disp,
            )

    # Check 2: RANGE (e.g. "25 to 250 kVA")
    elif c_type == "RANGE":
        min_v = std_constr["min_value"]
        max_v = std_constr["max_value"]
        s_disp = f"{min_v} to {max_v} {s_unit}"
        if min_v <= t_val <= max_v:
            return ParameterCheckResult(
                key=param_key,
                status="COMPATIBLE",
                match_type="RANGE_MATCH",
                score=1.0,
                details=f"Tender {t_disp} falls within standard applicable range ({s_disp})",
                tender_display=t_disp,
                standard_display=s_disp,
            )
        else:
            return ParameterCheckResult(
                key=param_key,
                status="CONFLICT",
                match_type="VALUE_MISMATCH",
                score=-1.0,
                details=f"Tender {t_disp} is outside standard range ({s_disp})",
                tender_display=t_disp,
                standard_display=s_disp,
            )

    # Check 3: DISCRETE RATINGS (e.g. "11 kV, 22 kV, 33 kV" or "415 V")
    elif c_type == "DISCRETE_RATINGS":
        vals = std_constr.get("values", [])
        s_disp = f"{', '.join(str(v) for v in vals)} {s_unit}"
        # Exact numeric match or tolerance within 2%
        if any(abs(t_val - v) / (v or 1.0) < 0.02 for v in vals):
            return ParameterCheckResult(
                key=param_key,
                status="COMPATIBLE",
                match_type="EXACT_MATCH",
                score=1.0,
                details=f"Tender {t_disp} matches declared standard rating ({t_disp})",
                tender_display=t_disp,
                standard_display=s_disp,
            )
        # If tender value is completely outside all declared discrete ratings
        elif t_val > max(vals) * 1.05 or t_val < min(vals) * 0.95:
            return ParameterCheckResult(
                key=param_key,
                status="CONFLICT",
                match_type="VALUE_MISMATCH",
                score=-1.0,
                details=f"Tender {t_disp} differs from standard declared ratings ({s_disp})",
                tender_display=t_disp,
                standard_display=s_disp,
            )
        else:
            return ParameterCheckResult(
                key=param_key,
                status="COMPATIBLE",
                match_type="RANGE_MATCH",
                score=0.8,
                details=f"Tender {t_disp} aligns with standard rating spectrum ({s_disp})",
                tender_display=t_disp,
                standard_display=s_disp,
            )

    # Check 4: Unstructured mention without structured constraints
    return ParameterCheckResult(
        key=param_key,
        status="UNKNOWN",
        match_type="NO_STANDARD_LIMIT",
        score=0.0,
        details=f"Standard mentions '{param_key}' in scope text without structured numeric limits",
        tender_display=t_disp,
        standard_display="Textual mention only",
    )


def audit_requirement_parameters(
    attributes: list[dict[str, Any]],
    std_text: str,
) -> tuple[float, list[ParameterCheckResult], bool]:
    """Audits all requirement attributes against standard text.
    
    Returns:
    - aggregated parameter score in [-1.0, 1.0]
    - list of individual check results
    - has_conflict: True if ANY hard conflict was detected
    """
    if not attributes or not std_text:
        return 0.0, [], False

    results: list[ParameterCheckResult] = []
    has_conflict = False
    scores: list[float] = []

    for attr in attributes:
        if not attr or not isinstance(attr, dict):
            continue
        key = attr.get("key") or ""
        raw_val = attr.get("raw_value") or ""
        norm_val = attr.get("normalized_value")
        unit = attr.get("unit") or attr.get("canonical_unit") or ""
        comp = attr.get("comparator") or "="
        high_val = attr.get("value_high")

        if not key or (not raw_val and norm_val is None):
            continue

        res = evaluate_parameter_compatibility(
            param_key=key,
            tender_raw=raw_val,
            std_text=std_text,
            unit=unit,
            normalized_value=norm_val,
            comparator=comp,
            value_high=high_val,
        )
        results.append(res)
        if res.status == "CONFLICT":
            has_conflict = True
            scores.append(res.score)
        elif res.status == "COMPATIBLE":
            scores.append(res.score)

    if has_conflict:
        return -1.0, results, True
    if scores:
        return round(sum(scores) / len(scores), 3), results, False

    return 0.0, results, False
