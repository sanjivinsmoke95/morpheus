"""Phase 4: coverage, gaps, conflicts, readiness."""

from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login

# Tender with a deliberate voltage conflict (230 V vs 415 V) and no safety requirement.
TENDER = b"""3.1 Minimum operating pressure 10 bar.
3.2 The supply voltage shall be 230 V.
3.3 The motor shall be rated for 415 V, 50 Hz.
3.4 Body of cast iron.
3.5 Tested as per IS 1520 : 2007.
3.6 ISI mark and BIS certification required.
"""


def _run(client, db_sessionmaker, h):
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    doc = client.post(f"{API}/documents", headers=h, files={"file": ("t.txt", TENDER, "text/plain")}).json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"], "sector": "mechanical"}).json()
    assert client.get(f"{API}/analyses/{an['id']}", headers=h).json()["status"] == "READY"
    return an["id"]


def test_conflict_detection(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    conflicts = client.get(f"{API}/analyses/{aid}/conflicts", headers=h).json()
    volt = [c for c in conflicts if c["parameter"] == "voltage"]
    assert volt, "expected a voltage conflict (230 V vs 415 V)"
    c = volt[0]
    assert {c["value_a"], c["value_b"]} == {"230", "415"}
    assert c["severity"] == "high" and c["status"] == "REVIEW_REQUIRED"


def test_no_false_conflict_on_equivalent_units(client, db_sessionmaker):
    h = login(client)
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    # 10 bar and 1 MPa are the SAME pressure — must not be a conflict.
    tender = b"3.1 Pressure 10 bar.\n3.2 Pressure 1 MPa.\n"
    doc = client.post(f"{API}/documents", headers=h, files={"file": ("t.txt", tender, "text/plain")}).json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"]}).json()
    conflicts = client.get(f"{API}/analyses/{an['id']}/conflicts", headers=h).json()
    assert not [c for c in conflicts if c["parameter"] == "pressure"]


def test_coverage_and_gaps(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    coverage = client.get(f"{API}/analyses/{aid}/coverage", headers=h).json()
    assert coverage and any(c["coverage"] == "FULL" for c in coverage)

    gaps = client.get(f"{API}/analyses/{aid}/gaps", headers=h).json()
    # The tender has no safety requirement → a potential safety gap, never "mandatory".
    assert any(g["gap_type"] == "missing_safety" for g in gaps)
    assert all(g["is_mandatory_claim"] is False for g in gaps)


def test_readiness_dashboard(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    r = client.get(f"{API}/analyses/{aid}/readiness", headers=h).json()
    assert r["standards_identified"] >= 1
    assert r["requirements_total"] >= 1
    assert r["conflicts"] >= 1  # the voltage conflict
    assert r["pending_review_items"] >= 1


def test_alternatives(client, db_sessionmaker):
    h = login(client)
    aid = _run(client, db_sessionmaker, h)
    reqs = client.get(f"{API}/analyses/{aid}/requirements", headers=h).json()
    material = next(r for r in reqs if r["requirement_type"] == "MATERIAL")
    alt = client.get(f"{API}/requirements/{material['id']}/alternatives", headers=h).json()
    assert alt["primary"] is not None
    # Multiple demo standards match cast iron → alternatives exist.
    assert alt["alternatives"] or alt["related"]
