"""Admin: standards management, CSV import, validation, relationships, QCO/cert."""

import io

from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login


def _seed(db_sessionmaker):
    db = db_sessionmaker(); seed_demo_standards(db); db.close()


def test_officer_cannot_manage_standards(client):
    officer = login(client, "officer@example.com")
    r = client.post(f"{API}/admin/standards", headers=officer, json={"is_number": "IS 1 : 2020", "title": "X"})
    assert r.status_code == 403  # only admins mutate the authoritative catalogue


def test_admin_create_edit_validate_standard(client):
    admin = login(client, "admin@example.com")
    r = client.post(f"{API}/admin/standards", headers=admin, json={
        "is_number": "IS 9999 : 2024", "title": "Demo widget standard", "scope": "Widgets scope",
        "keywords": ["widget"], "sector": "mechanical", "data_origin": "AUTHORITATIVE"})
    assert r.status_code == 201
    sid = r.json()["id"]

    # It becomes searchable (embeddings were indexed).
    found = client.get(f"{API}/standards?q=widget", headers=admin).json()
    assert any(s["is_number"] == "IS 9999 : 2024" for s in found)

    # Edit + validate.
    client.patch(f"{API}/admin/standards/{sid}", headers=admin, json={"scope": "Updated widget scope"})
    v = client.post(f"{API}/admin/standards/{sid}/validate", headers=admin).json()
    assert v["ok"] is True

    # Duplicate number is rejected.
    dup = client.post(f"{API}/admin/standards", headers=admin, json={"is_number": "IS 9999 : 2024", "title": "again"})
    assert dup.status_code == 409


def test_csv_import(client):
    admin = login(client, "admin@example.com")
    csv = b"is_number,title,scope,sector,keywords\nIS 7001 : 2020,Test A,Scope A,water,pipe;valve\nIS 7002 : 2021,Test B,,civil,\n,No number,,,\n"
    r = client.post(f"{API}/admin/standards/import", headers=admin,
                    files={"file": ("std.csv", io.BytesIO(csv), "text/csv")})
    body = r.json()
    assert body["inserted"] == 2 and len(body["rejected"]) == 1


def test_admin_relationship_qco_certification(client, db_sessionmaker):
    _seed(db_sessionmaker)
    admin = login(client, "admin@example.com")
    rel = client.post(f"{API}/admin/relationships", headers=admin, json={
        "from_is_number": "IS 1520 : 2007", "to_is_number": "IS 2062 : 2011",
        "relationship_type": "MATERIAL", "note": "test edge"})
    assert rel.status_code == 201

    q = client.post(f"{API}/admin/qco", headers=admin, json={
        "is_number": "IS 1520 : 2007", "qco_status": "CONDITIONAL", "product_description": "pumps"})
    assert q.status_code == 201

    c = client.post(f"{API}/admin/certification", headers=admin, json={
        "is_number": "IS 1520 : 2007", "scheme": "ISI", "requirement": "ISI marking"})
    assert c.status_code == 201


def test_ingestion_status(client, db_sessionmaker):
    _seed(db_sessionmaker)
    admin = login(client, "admin@example.com")
    st = client.get(f"{API}/admin/ingestion", headers=admin).json()
    assert st["standards"] >= 14 and st["chunks"] >= 1
    assert st["relationships"] >= 1 and st["embedding_model"]
