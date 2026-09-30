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
    ("Distribution Transformer", "electrical", ["distribution transformer", "power transformer", "kva transformer", "oil immersed transformer", "transformer"]),
    ("Centrifugal Pump", "mechanical", ["submersible pump", "centrifugal pump", "monobloc pump", "borewell pump", "tube-well pump", "rotodynamic pump", "pump set", "pump"]),
    ("Induction Motor", "electrical", ["induction motor", "three phase motor", "squirrel cage", "electric motor", "electric drive", "bldc motor", "motor", "drive"]),
    ("LED Luminaire", "electrical", ["led luminaire", "street light", "flood light", "luminaire", "led lamp", "lighting"]),
    ("Solar PV System", "electrical", ["solar photovoltaic", "pv module", "solar panel", "charge controller", "photovoltaic", "solar"]),
    ("Switchgear", "electrical", ["circuit breaker", "air circuit breaker", "mcb", "mccb", "switchgear", "controlgear", "panel board"]),
    ("Cable & Conductor", "electrical", ["power cable", "conductor", "xlpe cable", "pvc cable", "wiring", "cable"]),
    ("Battery / Storage", "electrical", ["lithium ion", "storage battery", "lifepo4", "lead acid battery", "battery", "cell"]),
    ("Valve / Fitting", "mechanical", ["gate valve", "ball valve", "check valve", "butterfly valve", "valve", "pipe fitting"]),
    ("Pressure Vessel / Gauge", "mechanical", ["pressure gauge", "bourdon tube", "pressure vessel", "boiler"]),
    ("Structural Steel", "materials", ["structural steel", "steel section", "rolled steel", "e250", "steel beam", "i-beam"]),
    ("Steel Pole", "materials", ["tubular pole", "lighting pole", "octagonal pole", "steel pole", "swaged pole"]),
    ("Casting / Forging", "materials", ["grey iron casting", "iron casting", "casting", "grey iron", "forging", "ductile iron"]),
    ("Cement / Concrete", "civil", ["reinforced concrete", "concrete", "portland cement", "cement", "rcc", "aggregate"]),
    ("Pipe (Water)", "water", ["ductile iron pipe", "di pipe", "pvc pipe", "hdpe pipe", "upvc pipe", "water supply pipe", "potable water pipe", "pipe"]),
    ("Electronic Apparatus", "electronics", ["electronic apparatus", "audio video", "it equipment", "power adapter", "electronic equipment"]),
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
    product_category: str                   # Legacy: e.g. "Distribution Transformer"
    sub_category: str                       # Legacy: e.g. "Oil Immersed"
    sector: str                             # e.g. "electrical"
    installation: str                       # "outdoor" | "indoor" | ...
    phases: int | None                      # 1 | 3 | None
    parameters: dict[str, str]              # e.g. {"voltage": "11 kV", "capacity": "25 kVA"}
    method: str                             # "deterministic" | "llm_assisted"
    matched_keywords: list[str] = field(default_factory=list)
    confidence: str = "MEDIUM"

    # Canonical profile attributes (Phase 3)
    product: str = ""                       # Canonical specific product: "Oil Immersed Distribution Transformer"
    category: str = ""                      # Broader category: "Electrical Equipment"
    capacity: str = ""                      # Rating / capacity: "25 kVA"
    canonical_spec: str = ""                # Summary: "Distribution Transformer, 25 kVA, 3-phase, outdoor"

    def to_dict(self) -> dict:
        d = asdict(self)
        if not d.get("product"):
            d["product"] = f"{self.sub_category} {self.product_category}".strip() if self.sub_category else self.product_category
        if not d.get("category"):
            d["category"] = f"{self.sector.title()} Infrastructure" if self.sector else self.product_category
        if not d.get("capacity"):
            d["capacity"] = self.parameters.get("capacity") or self.parameters.get("power") or self.parameters.get("pressure") or ""
        return d


_SECTOR_TO_CATEGORY_GROUP = {
    "electrical": "Electrical Equipment & Power Infrastructure",
    "mechanical": "Mechanical Machinery & Pumping Systems",
    "water": "Water Supply & Public Health Engineering",
    "civil": "Civil Construction & Structural Materials",
    "materials": "Metallurgical & Construction Materials",
    "safety": "Fire Safety & Life Protection Equipment",
    "electronics": "Electronic & Telecommunication Apparatus",
}


def classify_product(requirement_dicts: list[dict] | str, analysis_sector: str = "") -> ProductProfile:
    """requirement_dicts: [{description, requirement_type, attributes:[{key,raw_value,unit,canonical_unit,normalized_value}]}] or a raw string."""
    if isinstance(requirement_dicts, str):
        requirement_dicts = [{"description": requirement_dicts}]
    raw_corpus = " ".join((r.get("description") or "") for r in requirement_dicts)
    from app.services.extraction.multilingual import canonicalize_text
    corpus = canonicalize_text(raw_corpus).lower()

    category, sector, matched = "Uncategorised", analysis_sector or "", []
    best_score = 0
    for cat, sec, kws in _CATEGORY_KEYWORDS:
        hits = [k for k in kws if k in corpus]
        if hits:
            score = sum(len(k.split()) * 3 for k in hits)
            if analysis_sector and sec.lower() == analysis_sector.lower():
                score += 4
            if score > best_score:
                best_score = score
                category = cat
                sector = sec if not analysis_sector else analysis_sector
                matched = hits

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
                         ("galvanised", "Hot-dip Galvanised"), ("galvanized", "Hot-dip Galvanised"),
                         ("submersible", "Submersible Borehole"), ("centrifugal", "Centrifugal Horizontal"),
                         ("tmt", "Thermo-Mechanically Treated (TMT)")]:
        if token in corpus:
            sub = label
            break

    confidence = "HIGH" if len(matched) >= 2 else "MEDIUM" if matched else "LOW"

    # Derive canonical profile fields
    canonical_prod = f"{sub} {category}".strip() if sub and sub.lower() not in category.lower() else category
    broad_cat = _SECTOR_TO_CATEGORY_GROUP.get(sector, f"{sector.title()} Infrastructure" if sector else category)
    capacity_val = params.get("capacity") or params.get("power") or params.get("pressure") or params.get("dimension") or ""

    spec_parts = [canonical_prod]
    if capacity_val:
        spec_parts.append(capacity_val)
    if phases:
        spec_parts.append(f"{phases}-phase")
    if installation:
        spec_parts.append(installation)
    canonical_spec_str = ", ".join(spec_parts)

    return ProductProfile(
        product_category=category, sub_category=sub, sector=sector, installation=installation,
        phases=phases, parameters=params, method="deterministic",
        matched_keywords=matched, confidence=confidence,
        product=canonical_prod, category=broad_cat, capacity=capacity_val,
        canonical_spec=canonical_spec_str,
    )

