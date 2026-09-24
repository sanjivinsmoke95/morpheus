# Multilingual Input

Indian tenders arrive in English, Hindi and regional languages, often mixed in one
document. MORPHEUS makes non-English specifications usable by the existing (English)
extraction + retrieval pipeline **without claiming full multilingual NLP**.

## Pipeline (`app/services/extraction/multilingual.py`)

```
language / script detection
  → numeral normalization  (Devanagari/Telugu/Tamil/Kannada/Bengali → ASCII)
  → unit normalization     (किलोवाट → kW)
  → technical-term mapping  (मोटर → motor)   [deterministic FALLBACK dictionary]
  → canonical English text
  → existing extraction + retrieval
```

- **Scripts detected:** Hindi & Marathi (Devanagari), Bengali, Tamil, Telugu, Kannada,
  plus English (Latin). Mixed-language pages are flagged.
- **Numerals:** the load-bearing spec data (values) is transliterated deterministically
  regardless of language (e.g. `११ किलोवोल्ट` → `11 kV`).
- **Terms:** a Hindi→English procurement dictionary is a *fallback* layer, not the whole
  system. A real LLM/translation provider (see `ai-providers.md`) produces a better
  canonical translation when enabled.

## What is preserved

Original language, original text, and per-page language metadata (`analysis.languages_json`).
Nothing is fabricated — only script-transliteration and term mapping of text that actually
appears in the document. The UI shows *Detected language* and a *Multilingual extraction* chip.

## Limitation

The dictionary covers common procurement terms; uncommon phrasing needs the LLM path.
This is a deterministic, offline aid — not a claim of perfect multilingual understanding.

## Tests

`tests/test_multilingual_product.py` covers numeral transliteration, term mapping,
mixed-language detection and English-only detection. `scripts/seed_scenarios.py` seeds a
bilingual Hindi+English demo tender that classifies end-to-end.
