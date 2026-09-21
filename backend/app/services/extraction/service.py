"""Requirement extraction orchestration: pages → normalized, coded requirements.

Uses the deterministic rule extractor by default. When a real LLM is configured,
`_llm_extract` can propose requirements in the same schema; results are validated
and normalized identically. Normalization is always deterministic.
"""

from __future__ import annotations

from app.services.extraction import rules
from app.services.normalization.units import normalize


def run_extraction(pages: list[tuple[int, str]], *, method: str = "rule") -> list[dict]:
    """pages: list of (page_number, text). Returns persist-ready requirement dicts."""
    raw: list[dict] = []
    for page_number, text in pages:
        raw.extend(rules.extract_from_page(page_number, text))

    deduped = _dedupe(raw)
    out: list[dict] = []
    for i, req in enumerate(deduped, start=1):
        req["req_code"] = f"R-{i:03d}"
        req["extraction_method"] = method
        for attr in req.get("attributes", []):
            _normalize_attr(attr)
        out.append(req)
    return out


def _normalize_attr(attr: dict) -> None:
    raw = attr.get("raw_value")
    unit = attr.get("unit") or ""
    attr.setdefault("normalized_value", None)
    attr.setdefault("canonical_unit", unit)
    attr.setdefault("value_high_normalized", None)
    if raw is None or unit == "":
        return
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return
    nv, cu = normalize(value, unit)
    attr["normalized_value"] = nv
    attr["canonical_unit"] = cu
    if attr.get("value_high") is not None:
        try:
            hv, _ = normalize(float(attr["value_high"]), unit)
            attr["value_high_normalized"] = hv
        except (TypeError, ValueError):
            pass


def _dedupe(reqs: list[dict]) -> list[dict]:
    """Collapse requirements with identical (type, normalized description)."""
    seen: dict[tuple[str, str], dict] = {}
    for r in reqs:
        key = (r["requirement_type"], " ".join(r["description"].lower().split()))
        if key not in seen:
            seen[key] = r
    return list(seen.values())
