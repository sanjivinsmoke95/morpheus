"""Human review: full decision set + officer add-standard."""

from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login

TENDER = b"3.1 Pump body of cast iron.\n3.2 Tested as per IS 1520 : 2007.\n"


def _run(client, db_sessionmaker, h):
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    doc = client.post(f"{API}/documents", headers=h, files={"file": ("t.txt", TENDER, "text/plain")}).json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"], "sector": "mechanical"}).json()
    assert client.get(f"{API}/analyses/{an['id']}", headers=h).json()["status"] == "READY"
    return an["id"]


def test_mark_for_review_and_comment_persist(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    rec = client.get(f"{API}/analyses/{aid}/recommendations", headers=h).json()[0]
    client.post(f"{API}/analyses/{aid}/reviews/decisions", headers=h, json={
        "target_type": "recommendation", "target_id": rec["id"], "decision": "MARK_FOR_REVIEW", "reason": "check scope"})
    updated = client.get(f"{API}/recommendations/{rec['id']}", headers=h).json()
    assert updated["review_status"] == "REVIEW"
    decisions = client.get(f"{API}/analyses/{aid}/reviews/decisions", headers=h).json()
    assert any(d["decision"] == "MARK_FOR_REVIEW" for d in decisions)


def test_officer_add_existing_standard(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    reqs = client.get(f"{API}/analyses/{aid}/requirements", headers=h).json()
    req = reqs[0]
    before = len(client.get(f"{API}/analyses/{aid}/recommendations?requirement_id={req['id']}", headers=h).json())

    # A PVC-pipe standard won't already be matched to a pump-material requirement.
    r = client.post(f"{API}/analyses/{aid}/reviews/add-standard", headers=h,
                    json={"requirement_id": req["id"], "is_number": "IS 4985 : 2000", "reason": "also relevant"})
    assert r.status_code == 201
    after = client.get(f"{API}/analyses/{aid}/recommendations?requirement_id={req['id']}", headers=h).json()
    assert len(after) == before + 1
    added = next(x for x in after if x["standard"]["is_number"] == "IS 4985 : 2000")
    assert added["retrieval_method"] == "officer" and added["evidence"]  # grounded


def test_add_unknown_standard_rejected(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    req = client.get(f"{API}/analyses/{aid}/requirements", headers=h).json()[0]
    r = client.post(f"{API}/analyses/{aid}/reviews/add-standard", headers=h,
                    json={"requirement_id": req["id"], "is_number": "IS 00000 : 1900"})
    assert r.status_code == 404  # can't invent an authoritative standard
