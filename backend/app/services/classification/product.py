"""Product / domain classification (mission Phase 1).

Given a tender's extracted requirements, derive a normalized product profile —
category, sub-category, key parameters (voltage/capacity/phases/installation) and
sector. Deterministic and keyless by default; when a real LLM provider is enabled
it may PROPOSE a category, but the deterministic evidence here is authoritative
and the LLM never overrides a hard keyword/parameter match.

Every field carries how it was derived so the UI can show provenance.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

# category -> keywords that identify it (checked in order; first strong hit wins).
_CATEGORY_KEYWORDS: list[tuple[str, str, list[str]]] = [
    # (product_category, sector, keywords)
    ("Distribution Transformer", "electrical", ["transformer", "distribution transformer", "kva transformer"]),
    ("Induction Motor", "electrical", ["induction motor", "three phase motor", "motor", "bldc"]),
    ("LED Luminaire", "electrical", ["led luminaire", "street light", "luminaire", "led lamp", "lighting"]),
    ("Solar PV System", "electrical", ["solar", "photovoltaic", "pv module", "charge controller", "solar panel"]),
    ("Switchgear", "electrical", ["switchgear", "mcb", "circuit breaker", "controlgear", "panel board"]),
    ("Cable & Conductor", "electrical", ["cable", "conductor", "wiring", "xlpe", "pvc insulated"]),
    ("Battery / Storage", "electrical", ["battery", "lithium", "lifepo4", "storage battery", "cell"]),
    ("Centrifugal Pump", "mechanical", ["centrifugal pump", "pump", "rotodynamic"]),
    ("Valve / Fitting", "mechanical", ["valve", "gate valve", "ball valve", "fitting"]),
    ("Pressure Vessel / Gauge", "mechanical", ["pressure gauge", "pressure vessel", "gauge", "boiler"]),
    ("Structural Steel", "materials", ["structural steel", "steel section", "rolled steel", "e250", "beam"]),
    ("Steel Pole", "materials", ["pole", "tubular pole", "lighting pole", "octagonal pole"]),
    ("Casting / Forging", "materials", ["casting", "grey iron", "forging", "ductile iron"]),
    ("Cement / Concrete", "civil", ["concrete", "cement", "rcc", "reinforced concrete", "aggregate"]),
    ("Pipe (Water)", "water", ["pipe", "pvc pipe", "hdpe pipe", "potable water", "water supply"]),
    ("Electronic Apparatus", "electronics", ["electronic apparatus", "audio", "video", "it equipment", "adapter"]),
]

_INSTALL = {
    "outdoor": ["outdoor", "external", "pole mounted", "street"],
    "indoor": ["indoor", "internal", "panel", "enclosure"],
    "underground": ["underground", "buried", "trench"],
    "submersible": ["submersible", "borewell", "immersed"],
}

# Parameter keys we surface in the profile (from normalized attributes).
_PROFILE_PARAMS = ["voltage", "power", "capacity", "current", "frequency", "pressure",
                   "temperature", "dimension", "weight"]

_PHASE_RE = re.compile(r"\b(single|three|3|1)\s*[- ]?\s*phase\b", re.IGNORECASE)


@dataclass
class ProductProfile:
    product_category: str
    sub_category: str
    sector: str
    installation: str
    phases: int | None
    parameters: dict[str, str]              # e.g. {"voltage": "11 kV", "power": "100 kVA"}
    method: str                             # "deterministic" | "llm_assisted"
    matched_keywords: list[str] = field(default_factory=list)
    confidence: str = "MEDIUM"

    def to_dict(self) -> dict:
        return asdict(self)


def classify_product(requirement_dicts: list[dict], analysis_sector: str = "") -> ProductProfile:
    """requirement_dicts: [{description, requirement_type, attributes:[{key,raw_value,unit,canonical_unit,normalized_value}]}]."""
    corpus = " ".join((r.get("description") or "") for r in requirement_dicts).lower()

    category, sector, matched = "Uncategorised", analysis_sector or "", []
    for cat, sec, kws in _CATEGORY_KEYWORDS:
        hits = [k for k in kws if k in corpus]
        if hits:
            category, matched = cat, hits
            sector = sec if not analysis_sector else analysis_sector
            break

    # Installation condition.
    installation = ""
    for label, kws in _INSTALL.items():
        if any(k in corpus for k in kws):
            installation = label
            break

    # Phases.
    phases = None
    pm = _PHASE_RE.search(corpus)
    if pm:
        tok = pm.group(1).lower()
        phases = 1 if tok in ("single", "1") else 3

    # Key parameters from normalized attributes (prefer the largest per key).
    params: dict[str, str] = {}
    for r in requirement_dicts:
        for a in r.get("attributes", []) or []:
            key = a.get("key")
            if key in _PROFILE_PARAMS and a.get("raw_value"):
                unit = a.get("unit") or ""
                params.setdefault(key, f"{a.get('raw_value')} {unit}".strip())

    # Sub-category heuristic (oil-immersed transformer, energy-efficient motor, etc.)
    sub = ""
    for token, label in [("oil immersed", "Oil Immersed"), ("dry type", "Dry Type"),
                         ("energy efficient", "Energy Efficient"), ("monocrystalline", "Monocrystalline"),
                         ("galvanised", "Hot-dip Galvanised"), ("galvanized", "Hot-dip Galvanised")]:
        if token in corpus:
            sub = label
            break

    confidence = "HIGH" if len(matched) >= 2 else "MEDIUM" if matched else "LOW"
    return ProductProfile(
        product_category=category, sub_category=sub, sector=sector, installation=installation,
        phases=phases, parameters=params, method="deterministic",
        matched_keywords=matched, confidence=confidence,
    )
