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
    ("Gujarati", "Gujarati", range(0x0A80, 0x0B00)),
    ("Tamil", "Tamil", range(0x0B80, 0x0C00)),
    ("Telugu", "Telugu", range(0x0C00, 0x0C80)),
    ("Kannada", "Kannada", range(0x0C80, 0x0D00)),
]

# ── Indic numerals → ASCII ─────────────────────────────────────────────────
_NUMERALS = {
    # Devanagari ०-९ (Hindi, Marathi, Sanskrit, Nepali)
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
    # Bengali ০-৯
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    # Gujarati ૦-૯
    "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4", "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9",
    # Telugu ౦-౯
    "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4", "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
    # Tamil ௦-௯
    "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4", "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9",
    # Kannada ೦-೯
    "೦": "0", "೧": "1", "೨": "2", "೩": "3", "೪": "4", "೫": "5", "೬": "6", "೭": "7", "೮": "8", "೯": "9",
}

# ── Technical term dictionary (fallback). Longest phrases first. ────────────
# Covers Hindi, Marathi, Telugu, Tamil, Bengali, Kannada, and Gujarati across
# Civil, Electrical, Mechanical, Water, Fire Safety, and Procurement domains.
_TERMS: dict[str, str] = {
    # ── Units & Measurement (Hindi/Devanagari) ──
    "किलोवोल्ट-एम्पीयर": "kVA", "मेगावोल्ट-एम्पीयर": "MVA", "किलोवाट-घंटे": "kWh",
    "किलोवाट-पीक": "kWp", "किलोवाट": "kW", "मेगावाट": "MW", "वाट": "W",
    "किलोवोल्ट": "kV", "मिलीवोल्ट": "mV", "वोल्ट": "V",
    "किलोएम्पीयर": "kA", "मिलीएम्पीयर": "mA", "एम्पीयर": "A",
    "किलोहर्ट्ज़": "kHz", "मेगाहर्ट्ज़": "MHz", "हर्ट्ज़": "Hz",
    "डिग्री सेल्सियस": "degC", "मेगापास्कल": "MPa", "किलोपास्कल": "kPa", "पास्कल": "Pa",
    "मिलीमीटर": "mm", "सेंटीमीटर": "cm", "किलोमीटर": "km", "मीटर": "m",
    "किलोग्राम": "kg", "ग्राम": "g", "मीट्रिक टन": "MT", "टन": "MT",
    "मिलीलीटर": "ml", "लीटर": "l", "बार": "bar", "लक्स": "lux", "लुमेन": "lumen",
    "आरपीएम": "rpm", "एएच": "Ah", "प्रतिशत": "%",

    # ── Civil, Structural & Materials (Hindi / Marathi) ──
    "संपीड़न सामर्थ्य": "compressive strength", "तन्यता सामर्थ्य": "tensile strength",
    "डक्टाइल आयरन": "ductile iron", "संरचनात्मक इस्पात": "structural steel",
    "प्रबलित कंक्रीट": "reinforced concrete", "कंक्रीट": "concrete", "सीमेंट": "cement",
    "पोर्टलैंड सीमेंट": "portland cement", "इस्पात": "steel", "स्टील": "steel",
    "रीबार": "rebar", "सरिया": "rebar", "टीएमटी": "TMT", "बिटुमेन": "bitumen",
    "डामर": "bitumen", "गिट्टी": "aggregate", "रोड़ी": "coarse aggregate",
    "बजरी": "gravel", "रेत": "sand", "बालू": "sand", "ईंट": "brick",
    "जलरोधी": "waterproofing", "संरचनात्मक": "structural", "नींव": "foundation",
    "सुदृढ़ीकरण": "reinforcement", "जस्ती": "galvanized", "गैल्वनाइज्ड": "galvanized",
    "तांबा": "copper", "एल्युमिनियम": "aluminium", "कास्ट आयरन": "cast iron",
    "ढलवां लोहा": "cast iron", "स्टेनलेस स्टील": "stainless steel",

    # ── Mechanical, Public Health & Water (Hindi / Marathi) ──
    "अपकेंद्री पंप": "centrifugal pump", "सबमर्सिबल पंप": "submersible pump",
    "स्लुइस वाल्व": "sluice valve", "बटरफ्लाई वाल्व": "butterfly valve",
    "चेक वाल्व": "check valve", "गैर-वापसी वाल्व": "non-return valve",
    "दाब गेज": "pressure gauge", "जल आपूर्ति": "water supply", "सीवरेज": "sewerage",
    "अग्निशामक": "fire extinguisher", "अग्निशमन": "fire fighting",
    "स्प्रिंकलर": "sprinkler", "हाइड्रेंट": "hydrant", "जल मीटर": "water meter",
    "भंडारण टैंक": "storage tank", "पंप": "pump", "वाल्व": "valve", "पाइप": "pipe",
    "संपीड़क": "compressor", "कंप्रेसर": "compressor", "दाब": "pressure",
    "निर्वात": "vacuum", "प्रवाह दर": "flow rate", "प्रवाह": "flow",
    "सिर": "head", "निर्वहन": "discharge",

    # ── Electrical, Power & Solar (Hindi / Marathi) ──
    "वितरण ट्रांसफार्मर": "distribution transformer", "शक्ति ट्रांसफार्मर": "power transformer",
    "इंडक्शन मोटर": "induction motor", "सौर पैनल": "solar panel", "सौर मॉड्यूल": "solar module",
    "सौर फोटोवोल्टिक": "solar photovoltaic", "चार्ज कंट्रोलर": "charge controller",
    "लिथियम बैटरी": "lithium battery", "सर्किट ब्रेकर": "circuit breaker",
    "आर्मर्ड केबल": "armoured cable", "अर्थिंग इलेक्ट्रोड": "earthing electrode",
    "शक्ति गुणांक": "power factor", "तापमान वृद्धि": "temperature rise",
    "ट्रांसफार्मर": "transformer", "मोटर": "motor", "सौर": "solar",
    "फोटोवोल्टिक": "photovoltaic", "ल्यूमिनेयर": "luminaire", "स्ट्रीट लाइट": "street light",
    "एलईडी": "led", "इनवर्टर": "inverter", "बैटरी": "battery",
    "स्विचगियर": "switchgear", "रिले": "relay", "फ्यूज": "fuse", "केबल": "cable",
    "तार": "wire", "चालक": "conductor", "रोधक": "insulator", "इन्सुलेशन": "insulation",
    "भू-सम्पर्कन": "earthing", "अर्थिंग": "earthing", "ऊर्जा मीटर": "energy meter",
    "वोल्टेज": "voltage", "धारा": "current", "आवृत्ति": "frequency", "शक्ति": "power",
    "क्षमता": "capacity", "दक्षता": "efficiency", "तापमान": "temperature",
    "तीन चरण": "three phase", "एकल चरण": "single phase", "बाहरी": "outdoor", "आंतरिक": "indoor",

    # ── Procurement, Standards, Quality & Legal (Hindi / Marathi) ──
    "भारतीय मानक ब्यूरो": "Bureau of Indian Standards", "भारतीय मानक": "Indian Standard",
    "मानक ब्यूरो": "Bureau of Indian Standards", "गुणवत्ता नियंत्रण आदेश": "Quality Control Order",
    "गुणवत्ता नियंत्रण": "quality control", "गुणवत्ता आश्वासन": "quality assurance",
    "तकनीकी विनिर्देश": "technical specification", "अनिवार्य प्रमाणन": "mandatory certification",
    "निविदा दस्तावेज": "tender document", "स्वीकृति परीक्षण": "acceptance test",
    "प्रकार परीक्षण": "type test", "नियमित परीक्षण": "routine test", "परीक्षण रिपोर्ट": "test report",
    "आईएसआई मार्क": "ISI mark", "बीआईएस प्रमाणन": "BIS certification", "बीआईएस": "BIS",
    "विनिर्देश": "specification", "निविदा": "tender", "प्रमाणन": "certification",
    "अनिवार्य": "mandatory", "अनुपालन": "compliance", "अनुरूपता": "conformity",
    "परीक्षण": "test", "निरीक्षण": "inspection", "निर्माता": "manufacturer",
    "आपूर्तिकर्ता": "supplier", "बोलीदाता": "bidder", "वारंटी": "warranty",
    "गारंटी": "guarantee", "आवश्यकता": "requirement", "सहनशीलता": "tolerance",
    "आयाम": "dimension", "वजन": "weight", "मोटाई": "thickness", "व्यास": "diameter",
    "लंबाई": "length", "चौड़ाई": "width", "ऊंचाई": "height",
    "न्यूनतम": "minimum", "अधिकतम": "maximum", "होना चाहिए": "shall be", "आवश्यक": "required",
    "सीमा": "limit", "सुरक्षा": "safety", "मानक": "standard",

    # ── Marathi specific terms ──
    "पोलाद": "steel", "काँक्रीट": "concrete", "सिमेंट": "cement", "वाळू": "sand", "वीट": "brick",
    "झडप": "valve", "पाईप": "pipe", "विद्युत प्रवाह": "current", "वारंवारता": "frequency",
    "तपशील": "specification", "चाचणी": "test", "प्रमाणपत्र": "certification", "हमी": "warranty",

    # ── Tamil Terms ──
    "மின்சாரம்": "electrical", "மின்னழுத்தம்": "voltage", "மின்னோட்டம்": "current",
    "மின்மாற்றி": "transformer", "மோட்டார்": "motor", "சூரிய": "solar", "சூரிய பேனல்": "solar panel",
    "மின்கலம்": "battery", "பேட்டரி": "battery", "குழாய்": "pipe", "வால்வு": "valve",
    "பம்ப்": "pump", "அழுத்தம்": "pressure", "எஃகு": "steel", "கான்கிரீட்": "concrete",
    "சிமெண்ட்": "cement", "மணல்": "sand", "செங்கல்": "brick", "கேபிள்": "cable",
    "தரநிலை": "standard", "விவரக்குறிப்பு": "specification", "டெண்டர்": "tender",
    "சோதனை": "test", "சான்றிதழ்": "certification", "கட்டாய": "mandatory", "உத்தரவாதம்": "warranty",

    # ── Telugu Terms ──
    "విద్యుత్": "electrical", "వోల్టేజ్": "voltage", "కరెంట్": "current",
    "ట్రాన్స్‌ఫార్మర్": "transformer", "మోటార్": "motor", "సోలార్": "solar", "సోలార్ ప్యానెల్": "solar panel",
    "బ్యాటరీ": "battery", "పైపు": "pipe", "వాల్వ్": "valve", "పంపు": "pump",
    "పీడనం": "pressure", "ఉక్కు": "steel", "కాంక్రీట్": "concrete", "సిమెంట్": "cement",
    "ఇసుక": "sand", "ఇటుక": "brick", "కేబుల్": "cable", "ప్రమాణం": "standard",
    "వివరణ": "specification", "టెండర్": "tender", "పరీక్ష": "test",
    "ధృవీకరణ": "certification", "తప్పనిసరి": "mandatory", "వారంటీ": "warranty",

    # ── Bengali Terms ──
    "বিদ্যুৎ": "electrical", "ভোল্টেজ": "voltage", "কারেন্ট": "current",
    "ট্রান্সফরমার": "transformer", "মোটর": "motor", "সৌর": "solar", "সৌর প্যানেল": "solar panel",
    "ব্যাটারি": "battery", "পাইপ": "pipe", "ভালভ": "valve", "পাম্প": "pump",
    "চাপ": "pressure", "ইস্পাত": "steel", "কংক্রিট": "concrete", "সিমেন্ট": "cement",
    "বালি": "sand", "ইট": "brick", "কেবল": "cable", "মানদণ্ড": "standard",
    "বিবরণী": "specification", "দরপত্র": "tender", "পরীক্ষা": "test",
    "শংসাপত্র": "certification", "বাধ্যতামূলক": "mandatory", "ওয়ারেন্টি": "warranty",

    # ── Kannada Terms ──
    "ವಿದ್ಯುತ್": "electrical", "ವೋಲ್ಟೇಜ್": "voltage", "ಪ್ರವಾಹ": "current",
    "ಪರಿವರ್ತಕ": "transformer", "ಮೋಟಾರ್": "motor", "ಸೌರ": "solar", "ಸೌರ ಫಲಕ": "solar panel",
    "ಬ್ಯಾಟರಿ": "battery", "ಪೈಪ್": "pipe", "ಕವಾಟ": "valve", "ಪಂಪ್": "pump",
    "ಒತ್ತಡ": "pressure", "ಉಕ್ಕು": "steel", "ಕಾಂಕ್ರೀಟ್": "concrete", "ಸಿಮೆಂಟ್": "cement",
    "ಮರಳು": "sand", "ಇಟ್ಟಿಗೆ": "brick", "ಕೇಬಲ್": "cable", "ಗುಣಮಟ್ಟ": "standard",
    "ವಿವರಣೆ": "specification", "ಟೆಂಡರ್": "tender", "ಪರೀಕ್ಷೆ": "test",
    "ಪ್ರಮಾಣೀಕರಣ": "certification", "ಕಡ್ಡಾಯ": "mandatory", "ವಾರಂಟಿ": "warranty",

    # ── Gujarati Terms ──
    "વીજળી": "electrical", "વોલ્ટેજ": "voltage", "કરંટ": "current",
    "ટ્રાન્સફોર્મર": "transformer", "મોટર": "motor", "સૌર": "solar", "સોલર પેનલ": "solar panel",
    "બેટરી": "battery", "પાઇપ": "pipe", "વાલ્વ": "valve", "પંપ": "pump",
    "દબાણ": "pressure", "સ્ટીલ": "steel", "કોંક્રિટ": "concrete", "સિમેન્ટ": "cement",
    "રેતી": "sand", "ઈંટ": "brick", "કેબલ": "cable", "ધોરણ": "standard",
    "સ્પષ્ટીકરણ": "specification", "ટેન્ડર": "tender", "ચકાસણી": "test",
    "પ્રમાણપત્ર": "certification", "ફરજિયાત": "mandatory", "વોરંટી": "warranty",
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
