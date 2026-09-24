"""Rule-based requirement extraction (deterministic, keyless).

Operates on the ACTUAL document text — regex/pattern logic, never fabrication.
A real LLM extractor implements the same output shape (ai-pipeline.md §3.2) and
plugs in behind `extraction.service`; this fallback keeps the slice working and
tests hermetic with no API key.
"""

from __future__ import annotations

import re

# Units we recognize (longest-first so 'mpa' matches before 'pa', 'kv' before 'v').
_UNITS = [
    "kva", "mva", "va", "kwp", "wp", "kwh",
    "kv", "mv", "v", "ka", "ma", "a", "khz", "mhz", "hz", "kw", "mw", "w",
    "mpa", "kpa", "pa", "mbar", "bar", "psi", "°c", "degc",
    "mm", "cm", "km", "m", "kg", "g", "ml", "l",
    "rpm", "ah", "%", "percent",
]
_UNIT_RE = "|".join(sorted((re.escape(u) for u in _UNITS), key=len, reverse=True))
_NUM = r"\d+(?:\.\d+)?"

# value + unit, optional comparator words before it.
_PARAM_RE = re.compile(
    rf"(?P<num>{_NUM})\s*(?P<unit>{_UNIT_RE})(?![a-z])",
    re.IGNORECASE,
)
_RANGE_RE = re.compile(rf"(?P<lo>{_NUM})\s*(?:to|-|–|—)\s*(?P<hi>{_NUM})\s*(?P<unit>{_UNIT_RE})(?![a-z])", re.IGNORECASE)
_IS_RE = re.compile(r"\bIS\s?(\d{2,5}(?:\s*[:/-]\s*\d{4})?(?:\s*\(?Part\s*\d+\)?)?)", re.IGNORECASE)
_SECTION_RE = re.compile(r"^\s*(\d+(?:\.\d+){0,3})[\s.)]")

_UNIT_TO_KEY = {
    "v": "voltage", "kv": "voltage", "mv": "voltage",
    "a": "current", "ma": "current", "ka": "current",
    "hz": "frequency", "khz": "frequency", "mhz": "frequency",
    "w": "power", "kw": "power", "mw": "power", "wp": "power", "kwp": "power",
    "va": "capacity_rating", "kva": "capacity_rating", "mva": "capacity_rating",
    "bar": "pressure", "mbar": "pressure", "pa": "pressure", "kpa": "pressure",
    "mpa": "pressure", "psi": "pressure",
    "°c": "temperature", "degc": "temperature",
    "mm": "dimension", "cm": "dimension", "m": "dimension", "km": "dimension",
    "kg": "weight", "g": "weight", "l": "capacity", "ml": "capacity",
    "rpm": "speed", "ah": "charge", "kwh": "energy", "%": "efficiency", "percent": "efficiency",
}

_MATERIALS = ["steel", "stainless steel", "cast iron", "copper", "aluminium", "aluminum",
              "pvc", "hdpe", "brass", "concrete", "cement", "rubber", "galvanized", "gi "]
_MIN_WORDS = ["minimum", "at least", "not less than", "min.", "≥", ">=", "greater than"]
_MAX_WORDS = ["maximum", "not more than", "not exceed", "max.", "≤", "<=", "less than", "up to"]
_TEST_WORDS = ["test", "tested", "type test", "routine test", "inspection", "sample"]
_SAFETY_WORDS = ["safety", "protection", "insulation", "earthing", "shock", "hazard", "fire"]
_CERT_WORDS = ["isi mark", "bis certif", "bis registration", "certification", "qco", "conformity", "iso 9001"]


def _comparator(context: str) -> str:
    low = context.lower()
    if any(w in low for w in _MIN_WORDS):
        return ">="
    if any(w in low for w in _MAX_WORDS):
        return "<="
    return "="


def _split_sentences(text: str) -> list[str]:
    # Split on newlines and sentence terminators. NOT on ':' — it would break a
    # standard reference like "IS 1520 : 2007" and lose the year.
    rough = re.split(r"(?<=[.;])\s+|\n+", text)
    return [s.strip() for s in rough if len(s.strip()) >= 4]


def extract_from_page(page_number: int, text: str) -> list[dict]:
    """Return a list of raw requirement dicts found on this page."""
    out: list[dict] = []
    section = ""
    for raw_line in text.splitlines():
        m = _SECTION_RE.match(raw_line)
        if m:
            section = m.group(1)
        for sentence in _split_sentences(raw_line):
            out.extend(_extract_sentence(sentence, page_number, section))
    return out


def _extract_sentence(sentence: str, page: int, section: str) -> list[dict]:
    low = sentence.lower()
    found: list[dict] = []

    # Referenced standards (highest confidence signal).
    for m in _IS_RE.finditer(sentence):
        found.append(_req("REFERENCED_STANDARD", sentence, page, section, "HIGH",
                          attrs=[{"key": "referenced_standard", "raw_value": "IS " + m.group(1).strip(),
                                  "unit": "", "comparator": "="}]))

    # Numeric parameters / ranges.
    attrs: list[dict] = []
    for m in _RANGE_RE.finditer(sentence):
        unit = m.group("unit")
        attrs.append({"key": _UNIT_TO_KEY.get(unit.lower(), "parameter"),
                      "raw_value": m.group("lo"), "value_high": m.group("hi"),
                      "unit": unit, "comparator": "range"})
    consumed = {(m.start(), m.end()) for m in _RANGE_RE.finditer(sentence)}
    for m in _PARAM_RE.finditer(sentence):
        if any(s <= m.start() < e for s, e in consumed):
            continue  # part of a range already captured
        unit = m.group("unit")
        attrs.append({"key": _UNIT_TO_KEY.get(unit.lower(), "parameter"),
                      "raw_value": m.group("num"), "unit": unit, "comparator": _comparator(sentence)})
    if attrs:
        rtype = "DIMENSION" if all(a["key"] == "dimension" for a in attrs) else "PARAMETER"
        found.append(_req(rtype, sentence, page, section, "HIGH", attrs=attrs))

    # Categorical requirement types (only if not already a numeric/standard line).
    if not found:
        if any(w in low for w in _CERT_WORDS):
            found.append(_req("CERTIFICATION", sentence, page, section, "MEDIUM"))
        elif any(w in low for w in _TEST_WORDS):
            found.append(_req("TESTING", sentence, page, section, "MEDIUM"))
        elif any(w in low for w in _SAFETY_WORDS):
            found.append(_req("SAFETY", sentence, page, section, "MEDIUM"))
        else:
            mat = next((mm for mm in _MATERIALS if mm in low), None)
            if mat:
                found.append(_req("MATERIAL", sentence, page, section, "MEDIUM",
                                  attrs=[{"key": "material", "raw_value": mat.strip(), "unit": "", "comparator": "="}]))
    return found


def _req(rtype: str, description: str, page: int, section: str, confidence: str, attrs: list[dict] | None = None) -> dict:
    return {
        "requirement_type": rtype,
        "description": description[:800],
        "source_page": page,
        "source_section": section,
        "confidence": confidence,
        "attributes": attrs or [],
    }
