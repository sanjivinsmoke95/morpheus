"""Phase 8: production demo hardening — real/scanned/malformed docs, failure paths.

These exercise the awkward inputs the demo must survive: nothing may crash the
API, and the system must abstain rather than fabricate.
"""

import io

import pytest

from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login

PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _make_text_pdf(text: str) -> bytes:
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


def _make_scanned_pdf(text: str) -> bytes:
    """A PDF whose page is an IMAGE of text (no text layer) → forces OCR."""
    import fitz
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (1000, 300), "white")
    d = ImageDraw.Draw(img)
    d.text((20, 120), text, fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    doc = fitz.open()
    page = doc.new_page(width=1000, height=300)
    page.insert_image(fitz.Rect(0, 0, 1000, 300), stream=buf.getvalue())
    data = doc.tobytes()
    doc.close()
    return data


def _make_docx(text: str) -> bytes:
    import docx
    d = docx.Document()
    for line in text.splitlines():
        d.add_paragraph(line)
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


def test_real_pdf_extraction(client):
    h = login(client)
    pdf = _make_text_pdf("3.1 Operating pressure 10 bar. 3.2 Voltage 415 V.")
    r = client.post(f"{API}/documents", headers=h, files={"file": ("spec.pdf", pdf, PDF_MIME)})
    assert r.status_code == 201
    assert r.json()["page_count"] >= 1 and r.json()["is_scanned"] is False
    pages = client.get(f"{API}/documents/{r.json()['id']}/pages", headers=h).json()
    assert pages and pages[0]["char_count"] > 0


def test_docx_extraction(client):
    h = login(client)
    docx_bytes = _make_docx("3.1 Pump body of cast iron.\n3.2 Pressure 10 bar.")
    r = client.post(f"{API}/documents", headers=h, files={"file": ("spec.docx", docx_bytes, DOCX_MIME)})
    assert r.status_code == 201


def test_scanned_pdf_triggers_ocr(client):
    h = login(client)
    scanned = _make_scanned_pdf("PRESSURE 10 BAR")
    r = client.post(f"{API}/documents", headers=h, files={"file": ("scan.pdf", scanned, PDF_MIME)})
    assert r.status_code == 201
    doc = r.json()
    assert doc["is_scanned"] is True
    pages = client.get(f"{API}/documents/{doc['id']}/pages", headers=h).json()
    assert pages[0]["ocr_used"] is True  # OCR actually ran


def test_corrupt_pdf_is_422_not_500(client):
    h = login(client)
    r = client.post(f"{API}/documents", headers=h, files={"file": ("bad.pdf", b"%PDF-1.4 broken garbage", PDF_MIME)})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_empty_tender_produces_no_requirements_gracefully(client, db_sessionmaker):
    h = login(client)
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    r = client.post(f"{API}/documents", headers=h, files={"file": ("empty.txt", b"   \n  \n", "text/plain")})
    doc = r.json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"]}).json()
    assert client.get(f"{API}/analyses/{an['id']}", headers=h).json()["status"] == "READY"
    assert client.get(f"{API}/analyses/{an['id']}/requirements", headers=h).json() == []


def test_unknown_referenced_standard_abstains(client, db_sessionmaker):
    h = login(client)
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    tender = b"3.1 Tested as per IS 99999 : 2050."  # not in the database
    doc = client.post(f"{API}/documents", headers=h, files={"file": ("t.txt", tender, "text/plain")}).json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"]}).json()
    versions = client.get(f"{API}/analyses/{an['id']}/versions", headers=h).json()
    assert versions and versions[0]["discrepancy_type"] == "UNKNOWN"
    assert versions[0]["confidence"] == "REVIEW_REQUIRED"  # abstains, never fabricates


def test_missing_resources_return_404_not_crash(client):
    h = login(client)
    assert client.get(f"{API}/analyses/does-not-exist", headers=h).status_code == 404
    assert client.get(f"{API}/standards/does-not-exist", headers=h).status_code == 404
    assert client.get(f"{API}/graph/edges/nope", headers=h).status_code == 404


def test_llm_provider_abstains_offline():
    from app.services.ai import get_llm
    result = get_llm().complete_json("extract requirements", schema=None)
    assert result.get("_abstain") is True  # stub → abstain, caller marks REVIEW_REQUIRED


def test_oversize_upload_rejected(client):
    h = login(client)
    big = b"x" * (26 * 1024 * 1024)  # > 25 MB limit
    r = client.post(f"{API}/documents", headers=h, files={"file": ("big.txt", big, "text/plain")})
    assert r.status_code == 413
