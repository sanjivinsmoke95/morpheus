"""GFR (General Financial Rules 2017) advisory review (mission Phase 16).

A deterministic rule engine that flags POSSIBLE procurement-review concerns for the
officer — it never declares a legal violation. Language is deliberately advisory:
"Potential Rule 173 consideration", "Officer/legal review recommended". Scans the
actual tender text; nothing is fabricated.

References (public, well-known): GFR 2017 Rule 149 (GeM), Rule 161/173 (specifications
and no brand-favouring), reasonableness of price, and sustainable procurement.
"""

from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Analysis, DocumentPage

# Brand / proprietary indicators (Rule 173 favours generic, functional specs).
_BRANDS = ["siemens", "abb", "schneider", "havells", "crompton", "l&t", "bosch", "philips", "wipro"]
_BRAND_HINTS = ["brand", "make of", "proprietary", "specific make", "reputed make"]
_EQUIV = ["or equivalent", "or similar", "equivalent make"]
_RESTRICTIVE = ["only", "sole", "single source", "exclusively", "must be of"]
_GEM = ["gem", "government e-marketplace", "gem portal"]
_SUSTAIN = ["energy efficient", "star rating", "bee", "recycl", "environment", "green"]

# Foreign / International Standards crosswalk to Indian Standards (GFR 2017 Rule 144(i)).
_FOREIGN_STANDARDS_MAP = {
    "astm a36": ("IS 2062", "Structural Steel"),
    "astm a53": ("IS 1239", "Mild Steel Tubes / Pipes"),
    "astm a106": ("IS 3589", "Seamless / Welded Steel Pipes"),
    "astm d1785": ("IS 4985", "Unplasticized PVC Pipes for Potable Water"),
    "astm d3035": ("IS 4984", "High Density Polyethylene (HDPE) Pipes"),
    "din 8062": ("IS 4985", "PVC Pipes for Water Supply"),
    "bs en 10025": ("IS 2062", "Hot Rolled Structural Steel"),
    "bs 5306": ("IS 15683", "Portable Fire Extinguishers"),
    "iec 60034": ("IS 12615", "Energy Efficient Three-Phase Induction Motors"),
    "iec 60502": ("IS 7098", "Crosslinked Polyethylene (XLPE) Insulated Cables"),
    "iec 60898": ("IS 8828", "Miniature Circuit Breakers (MCB)"),
    "iec 60598": ("IS 10322", "Luminaires (General and Street Lighting)"),
    "iec 61215": ("IS 14286", "Crystalline Silicon Terrestrial PV Modules"),
    "iec 61730": ("IS 14286", "Photovoltaic (PV) Module Safety Qualification"),
}
_FOREIGN_PATTERNS = [
    re.compile(r"\b(astm\s+[a-z]\s*\d+[a-z0-9]*)\b", re.IGNORECASE),
    re.compile(r"\b(din\s+\d+)\b", re.IGNORECASE),
    re.compile(r"\b(bs\s+en\s+\d+)\b", re.IGNORECASE),
    re.compile(r"\b(bs\s+\d{3,5})\b", re.IGNORECASE),
    re.compile(r"\b(iec\s+\d{4,5}(?:-\d+)?)\b", re.IGNORECASE),
    re.compile(r"\b(en\s+\d{4,5})\b", re.IGNORECASE),
]


def _text(db: Session, analysis: Analysis) -> str:
    pages = db.execute(select(DocumentPage).where(
        DocumentPage.document_id == analysis.document_id)).scalars().all()
    return "\n".join(p.text for p in pages).lower()


def gfr_review(db: Session, analysis_id: str) -> dict:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        return {"available": False}
    text = _text(db, analysis)
    flags: list[dict] = []
    # 1. GFR 2017 Rule 144(i) — Mandate for Indian Standards over foreign standards & non-discriminatory specs
    detected_foreign = []
    for pat in _FOREIGN_PATTERNS:
        for match in pat.finditer(text):
            detected_foreign.append(match.group(1).strip().lower())
    detected_foreign = sorted(set(detected_foreign))

    if detected_foreign:
        equiv_hints = []
        for df in detected_foreign:
            if df in _FOREIGN_STANDARDS_MAP:
                is_num, desc = _FOREIGN_STANDARDS_MAP[df]
                equiv_hints.append(f"{df.upper()} → {is_num} ({desc})")
        equiv_text = f" Equivalent Indian Standard(s): {', '.join(equiv_hints)}." if equiv_hints else ""

        flags.append({
            "rule": "Rule 144(i)", "severity": "HIGH",
            "title": "Foreign / international standard cited (BIS preference mandated)",
            "detail": f"Specification cites foreign/international standard(s): {', '.join(df.upper() for df in detected_foreign)}."
                      f" GFR 2017 Rule 144(i) mandates that Indian Standards published by the Bureau of Indian Standards (BIS) "
                      f"shall be specified wherever available.{equiv_text}",
            "action": "Replace foreign standard with the equivalent Indian Standard (IS), or record explicit technical justification.",
        })

    brand_terms = sorted({b for b in _BRANDS if re.search(rf"\b{re.escape(b)}\b", text)})
    brand_hint = any(h in text for h in _BRAND_HINTS)
    has_equiv = any(e in text for e in _EQUIV)
    if (brand_terms or brand_hint) and not has_equiv:
        flags.append({
            "rule": "Rule 173", "severity": "HIGH",
            "title": "Potential brand-favouring specification",
            "detail": ("Specification references a brand/proprietary make"
                       + (f" ({', '.join(brand_terms)})" if brand_terms else "")
                       + " without an 'or equivalent' clause. GFR Rule 173 favours generic, "
                         "functional specifications open to all eligible makes."),
            "action": "Add 'or equivalent' / make the spec generic, or record justification. Officer review recommended.",
        })

    if not any(g in text for g in _GEM):
        flags.append({
            "rule": "Rule 149", "severity": "MEDIUM",
            "title": "GeM availability not referenced",
            "detail": "No reference to the Government e-Marketplace (GeM). GFR Rule 149 requires "
                      "procurement of common goods/services through GeM where available.",
            "action": "Confirm whether the item is available on GeM before tendering outside it.",
        })

    restrictive = sorted({r for r in _RESTRICTIVE if r in text})
    if restrictive and not has_equiv:
        flags.append({
            "rule": "Rule 161", "severity": "MEDIUM",
            "title": "Potentially restrictive conditions",
            "detail": f"Restrictive language detected ({', '.join(restrictive)}). Specifications should "
                      "not unduly restrict competition.",
            "action": "Verify the restriction is technically justified; otherwise broaden. Officer review recommended.",
        })

    if not any(s in text for s in _SUSTAIN):
        flags.append({
            "rule": "Sustainable procurement", "severity": "LOW",
            "title": "No sustainability / energy-efficiency criteria",
            "detail": "No energy-efficiency (e.g. BEE star rating) or environmental criteria found.",
            "action": "Consider adding sustainability criteria where applicable.",
        })

    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    flags.sort(key=lambda f: order.get(f["severity"], 3))
    status = "REVIEW" if any(f["severity"] == "HIGH" for f in flags) else "ADVISORY" if flags else "OK"
    return {
        "available": True,
        "status": status,
        "flag_count": len(flags),
        "flags": flags,
        "disclaimer": "Advisory only — not a legal determination. Officer / legal review required.",
    }
