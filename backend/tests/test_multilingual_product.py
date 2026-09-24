"""Phase 1 (product classification) + Phase 3 (multilingual) unit tests."""

from app.services.classification.product import classify_product
from app.services.extraction.multilingual import (
    analyse_languages, canonicalize_pages, canonicalize_text,
)


def test_devanagari_numerals_transliterate():
    assert canonicalize_text("११ किलोवोल्ट").strip().replace("  ", " ") == "11 kV"
    assert "100" in canonicalize_text("१००")


def test_hindi_terms_map_to_english():
    out = canonicalize_text("मोटर का वोल्टेज ११ किलोवोल्ट होना चाहिए")
    assert "motor" in out and "voltage" in out and "kV" in out


def test_mixed_language_detection():
    langs = analyse_languages([(1, "The मोटर voltage 11 kV होना चाहिए")])
    assert langs[0]["mixed"] is True
    assert "Hindi" in langs[0]["languages"] and "English" in langs[0]["languages"]


def test_english_only_detection():
    langs = analyse_languages([(1, "The motor voltage shall be 11 kV")])
    assert langs[0]["language"] == "English"
    assert langs[0]["mixed"] is False


def test_telugu_numerals():
    assert "50" in canonicalize_text("౫౦")


def test_canonicalize_pages_preserves_pages():
    pages = canonicalize_pages([(1, "१५ kW"), (2, "plain english")])
    assert pages[0][0] == 1 and "15" in pages[0][1]
    assert pages[1] == (2, "plain english")


def test_product_classification_electrical_motor():
    reqs = [{"description": "Three phase induction motor rated 15 kW, 415 V outdoor",
             "requirement_type": "PRODUCT",
             "attributes": [{"key": "power", "raw_value": "15", "unit": "kW"},
                            {"key": "voltage", "raw_value": "415", "unit": "V"}]}]
    p = classify_product(reqs, "electrical")
    assert p.product_category == "Induction Motor"
    assert p.sector == "electrical"
    assert p.phases == 3
    assert p.installation == "outdoor"
    assert p.parameters.get("power") == "15 kW"
    assert p.confidence in ("HIGH", "MEDIUM")
    assert p.method == "deterministic"


def test_product_classification_civil_concrete():
    reqs = [{"description": "Reinforced concrete M20 grade with cement and aggregate",
             "requirement_type": "MATERIAL", "attributes": []}]
    p = classify_product(reqs, "")
    assert p.product_category == "Cement / Concrete"
    assert p.sector == "civil"


def test_product_classification_uncategorised_is_honest():
    p = classify_product([{"description": "xyz abc nothing here", "requirement_type": "PARAMETER", "attributes": []}], "")
    assert p.product_category == "Uncategorised"
    assert p.confidence == "LOW"
