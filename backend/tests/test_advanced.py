"""Phase 6: HS, multilingual, historical comparison, copilot, feedback."""

from app.services.ingestion.extract import detect_language
from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login

TENDER = b"""3.1 Pump body of cast iron.
3.2 Tested as per IS 1520 : 2007.
3.3 The supply voltage shall be 415 V.
"""


def _run(client, db_sessionmaker, h, title="Pump A"):
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    doc = client.post(f"{API}/documents", headers=h, files={"file": ("t.txt", TENDER, "text/plain")}).json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"], "sector": "mechanical", "title": title}).json()
    assert client.get(f"{API}/analyses/{an['id']}", headers=h).json()["status"] == "READY"
    return an["id"]


def test_language_detection():
    assert detect_language("The pump shall have pressure 10 bar") == "en"
    assert detect_language("पंप का दाब 10 बार होना चाहिए") == "hi"
    assert detect_language("పంపు ఒత్తిడి 10 బార్") == "te"


def test_hs_classify(client):
    h = login(client)
    r = client.post(f"{API}/hs/classify", headers=h, json={"text": "centrifugal water pump with cast iron body"})
    codes = {c["hs_code"] for c in r.json()["candidates"]}
    assert "8413" in codes  # pumps
    assert "customs" in r.json()["disclaimer"].lower()


def test_copilot_drafts_are_labelled(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    drafts = client.get(f"{API}/analyses/{aid}/copilot", headers=h).json()
    assert drafts, "expected draft suggestions from gaps"
    assert all("REQUIRES OFFICER REVIEW" in d["label"] for d in drafts)
    assert all("gap_id" in d for d in drafts)


def test_historical_comparison(client, db_sessionmaker):
    h = login(client)
    _run(client, db_sessionmaker, h, title="Pump A")           # becomes historical
    aid2 = _run(client, db_sessionmaker, h, title="Pump B")     # compared against Pump A
    cmp = client.get(f"{API}/analyses/{aid2}/history-compare", headers=h).json()
    assert cmp["similar"], "expected a similar historical tender"
    assert cmp["standards_previously_used"]


def test_feedback_capture(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    recs = client.get(f"{API}/analyses/{aid}/recommendations", headers=h).json()
    r = client.post(f"{API}/feedback", headers=h, json={
        "analysis_id": aid, "recommendation_id": recs[0]["id"], "decision": "ACCEPT", "reason": "correct"})
    assert r.status_code == 201
    # Admin can read the feedback dataset; officer cannot.
    admin = login(client, "admin@example.com")
    assert client.get(f"{API}/feedback", headers=admin).json()
    assert client.get(f"{API}/feedback", headers=h).status_code == 403
