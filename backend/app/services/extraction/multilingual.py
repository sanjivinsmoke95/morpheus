"""Multilingual input processing (mission Phase 3).

Indian tenders arrive in English, Hindi and regional languages, often mixed. This
module makes non-English specifications usable by the existing (English) extraction
+ retrieval pipeline WITHOUT claiming full multilingual NLP:

    language/script detection
        → numeral normalization (Devanagari/Telugu/Tamil/Kannada/Bengali → ASCII)
        → unit normalization (किलोवाट → kW)
        → technical-term normalization (मोटर → motor)  [dictionary FALLBACK layer]
        → canonical English text
        → existing retrieval pipeline

The dictionary is a deterministic *fallback*. When a real LLM/translation provider
is enabled it can produce a better canonical translation; the numeric/unit spec
data (the load-bearing part) is script-transliterated deterministically either way.

Nothing here fabricates requirements — it only transliterates and maps terms that
appear in the actual document, always preserving the original text.
"""

from __future__ import annotations

import re

# ── Script Unicode ranges → language label ─────────────────────────────────
_SCRIPTS: list[tuple[str, str, range]] = [
    ("Hindi", "Devanagari", range(0x0900, 0x0980)),   # Hindi + Marathi share Devanagari
    ("Bengali", "Bengali", range(0x0980, 0x0A00)),
    ("Tamil", "Tamil", range(0x0B80, 0x0C00)),
    ("Telugu", "Telugu", range(0x0C00, 0x0C80)),
    ("Kannada", "Kannada", range(0x0C80, 0x0D00)),
]

# ── Indic numerals → ASCII ─────────────────────────────────────────────────
_NUMERALS = {
    # Devanagari ०-९
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
    # Bengali
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    # Telugu
    "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4", "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
    # Tamil
    "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4", "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9",
    # Kannada
    "೦": "0", "೧": "1", "೨": "2", "೩": "3", "೪": "4", "೫": "5", "೬": "6", "೭": "7", "೮": "8", "೯": "9",
}

# ── Technical term dictionary (fallback). Longest phrases first. ────────────
# Hindi is the primary coverage; a few Telugu terms included. Extend as needed.
_TERMS: dict[str, str] = {
    # units (Hindi)
    "किलोवाट": "kW", "किलोवोल्ट": "kV", "वोल्ट": "V", "एम्पीयर": "A", "हर्ट्ज़": "Hz",
    "किलोवोल्ट-एम्पीयर": "kVA", "मेगावाट": "MW", "डिग्री सेल्सियस": "degC",
    "मिलीमीटर": "mm", "सेंटीमीटर": "cm", "मीटर": "m", "किलोग्राम": "kg",
    # domain nouns (Hindi)
    "मोटर": "motor", "ट्रांसफार्मर": "transformer", "पंप": "pump", "केबल": "cable",
    "स्विचगियर": "switchgear", "पैनल": "panel", "बैटरी": "battery", "सौर": "solar",
    "पाइप": "pipe", "इस्पात": "steel", "स्टील": "steel", "कंक्रीट": "concrete", "सीमेंट": "cement",
    "वोल्टेज": "voltage", "धारा": "current", "आवृत्ति": "frequency", "शक्ति": "power",
    "क्षमता": "capacity", "दाब": "pressure", "तापमान": "temperature", "आयाम": "dimension",
    "तन्यता": "tensile", "दक्षता": "efficiency", "सुरक्षा": "safety", "इन्सुलेशन": "insulation",
    "अर्थिंग": "earthing", "परीक्षण": "test", "प्रमाणन": "certification", "मानक": "standard",
    "तीन चरण": "three phase", "एकल चरण": "single phase", "बाहरी": "outdoor", "आंतरिक": "indoor",
    "न्यूनतम": "minimum", "अधिकतम": "maximum", "होना चाहिए": "shall be",
    "आवश्यकता": "requirement", "विनिर्देश": "specification", "निविदा": "tender",
    # a few Telugu
    "మోటార్": "motor", "వోల్టేజ్": "voltage", "పంపు": "pump", "ఉక్కు": "steel", "ప్రమాణం": "standard",
}
# Precompute a regex that matches any dictionary key (longest first).
_TERM_RE = re.compile("|".join(re.escape(k) for k in sorted(_TERMS, key=len, reverse=True)))


def _script_of(ch: str) -> tuple[str, str] | None:
    cp = ord(ch)
    for lang, script, rng in _SCRIPTS:
        if cp in rng:
            return lang, script
    return None


def analyse_languages(pages: list[tuple[int, str]]) -> list[dict]:
    """Per-page language/script summary. English is implied when Latin dominates."""
    out: list[dict] = []
    for page_number, text in pages:
        counts: dict[str, int] = {}
        latin = 0
        for ch in text or "":
            hit = _script_of(ch)
            if hit:
                counts[hit[0]] = counts.get(hit[0], 0) + 1
            elif ch.isascii() and ch.isalpha():
                latin += 1
        langs = sorted(counts, key=lambda k: counts[k], reverse=True)
        if latin > 0:
            langs.append("English")
        primary = langs[0] if langs else "English"
        script = next((s for (l, s, _r) in _SCRIPTS if l == primary), "Latin")
        out.append({
            "page": page_number, "language": primary, "script": script,
            "mixed": len(set(langs)) > 1, "languages": list(dict.fromkeys(langs)) or ["English"],
        })
    return out


def canonicalize_text(text: str) -> str:
    """Transliterate Indic numerals and map known technical terms to English.
    Preserves everything it does not recognise (never drops content)."""
    if not text:
        return text
    # 1) numerals
    text = "".join(_NUMERALS.get(ch, ch) for ch in text)
    # 2) technical terms (fallback dictionary)
    text = _TERM_RE.sub(lambda m: f" {_TERMS[m.group(0)]} ", text)
    return text


def canonicalize_pages(pages: list[tuple[int, str]]) -> list[tuple[int, str]]:
    return [(pn, canonicalize_text(t)) for pn, t in pages]
