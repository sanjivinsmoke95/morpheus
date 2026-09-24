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
