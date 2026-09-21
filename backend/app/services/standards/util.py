"""Helpers for standard identifiers."""

import re

_IS_NUM = re.compile(r"IS\s*0*(\d{2,5})", re.IGNORECASE)


def normalize_is_number(is_number: str) -> str:
    """'IS 1520 : 2007' -> 'IS1520' for matching referenced standards to records."""
    m = _IS_NUM.search(is_number or "")
    return f"IS{m.group(1)}" if m else re.sub(r"\s+", "", (is_number or "").upper())
