"""Phase 5: QCO, certification, amendment impact."""

from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login

TENDER = b"""3.1 Pump body of cast iron.
3.2 Tested as per IS 1520 : 2007.
3.3 Concrete works as per IS 456 : 2000.
"""


def _run(client, db_sessionmaker, h):
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    doc = client.post(f"{API}/documents", headers=h, files={"file": ("t.txt", TENDER, "text/plain")}).json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"], "sector": "mechanical"}).json()
    assert client.get(f"{API}/analyses/{an['id']}", headers=h).json()["status"] == "READY"
    return an["id"]


def test_qco_status_from_records_only(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    qco = client.get(f"{API}/analyses/{aid}/qco", headers=h).json()
    by = {q["is_number"]: q for q in qco if q["is_number"]}
    # IS 1520 pump → voluntary (from the stored record), labelled DEMO, with source.
    assert by["IS 1520 : 2007"]["qco_status"] == "VOLUNTARY"
    # Actual QCO records are DEMO_SYNTHETIC with provenance; standards without a record
    # are surfaced explicitly as REVIEW_REQUIRED (never silently assumed).
    records = [q for q in qco if q["qco_status"] != "REVIEW_REQUIRED"]
    assert all(q["data_origin"] == "DEMO_SYNTHETIC" for q in records)
    assert all(q["retrieved_at"] for q in records)  # provenance present
    assert any(q["qco_status"] == "REVIEW_REQUIRED" for q in qco)


def test_certification_records(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    cert = client.get(f"{API}/analyses/{aid}/certification", headers=h).json()
    assert any(c["scheme"] == "ISI" and c["is_number"] == "IS 1520 : 2007" for c in cert)


def test_amendment_impact_flagged_for_review(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    amends = client.get(f"{API}/analyses/{aid}/amendments", headers=h).json()
    # IS 456 is referenced/directly-applicable and has amendments.
    is456 = [a for a in amends if a["is_number"] == "IS 456 : 2000"]
    assert is456, "expected amendment findings for IS 456"
    assert all(a["confidence"] == "REVIEW_REQUIRED" for a in amends)  # never auto-interpreted
    assert is456[0]["affected_clauses"]
