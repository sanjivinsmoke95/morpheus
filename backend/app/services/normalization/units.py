"""Deterministic unit normalization (ai-pipeline.md §3.3).

Converts a (value, unit) into a canonical unit per physical dimension so that
requirements are comparable and conflict detection is exact (e.g. 10 bar == 1 MPa).
Uses `pint`; unknown units degrade gracefully to (None, raw_unit).
"""

from __future__ import annotations

import logging

from pint import UnitRegistry
from pint.errors import DimensionalityError, UndefinedUnitError

logger = logging.getLogger(__name__)

_ureg = UnitRegistry()
# Common procurement synonyms pint doesn't know out of the box.
_ureg.define("VA = volt * ampere")

# Canonical unit per physical dimension. Keyed on pint's dimensionality OBJECT
# (a hashable UnitsContainer), computed at import — robust across pint versions,
# unlike hand-written dimensionality strings.
_CANONICAL_UNITS = [
    "millimeter", "kilogram", "second", "ampere", "degC",
    "volt", "watt", "joule", "bar", "hertz", "liter",
]
_CANONICAL = {_ureg.Quantity(1, u).dimensionality: u for u in _CANONICAL_UNITS}

# Textual unit aliases → pint-parseable.
_ALIASES = {
    "v": "volt", "kv": "kilovolt", "mv": "millivolt",
    "a": "ampere", "ma": "milliampere", "ka": "kiloampere",
    "hz": "hertz", "khz": "kilohertz", "mhz": "megahertz",
    "w": "watt", "kw": "kilowatt", "mw": "megawatt",
    "bar": "bar", "mbar": "millibar", "pa": "pascal", "kpa": "kilopascal",
    "mpa": "megapascal", "psi": "psi",
    "mm": "millimeter", "cm": "centimeter", "m": "meter", "km": "kilometer",
    "°c": "degC", "degc": "degC", "c": "degC", "k": "kelvin",
    "kg": "kilogram", "g": "gram", "t": "metric_ton", "ton": "metric_ton",
    "l": "liter", "ml": "milliliter",
}


def normalize(value: float, unit: str) -> tuple[float | None, str]:
    """(value, unit) → (normalized_value_in_canonical_unit, canonical_unit_name).

    Returns (None, unit) when the unit is unknown, so callers can keep the raw
    value and flag it rather than fabricate a conversion.
    """
    raw_unit = (unit or "").strip()
    key = raw_unit.lower()
    pint_unit = _ALIASES.get(key, key)
    if not pint_unit:
        return None, raw_unit
    try:
        q = _ureg.Quantity(value, pint_unit)
    except (UndefinedUnitError, ValueError, AttributeError):
        logger.debug("unknown unit: %s", raw_unit)
        return None, raw_unit
    canonical = _CANONICAL.get(q.dimensionality)
    if not canonical:
        return float(q.magnitude), str(q.units)
    try:
        converted = q.to(canonical)
        return round(float(converted.magnitude), 6), canonical
    except (DimensionalityError, ValueError):
        return float(q.magnitude), str(q.units)


def same_quantity(a_value: float, a_unit: str, b_value: float, b_unit: str, *, rel_tol: float = 1e-3) -> bool | None:
    """True/False if two (value,unit) refer to the same physical quantity; None if
    not comparable (different dimensions or unknown units)."""
    na, ua = normalize(a_value, a_unit)
    nb, ub = normalize(b_value, b_unit)
    if na is None or nb is None or ua != ub:
        return None
    if na == 0 and nb == 0:
        return True
    return abs(na - nb) <= rel_tol * max(abs(na), abs(nb))
