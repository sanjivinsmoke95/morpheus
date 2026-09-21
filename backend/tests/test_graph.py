"""Phase 3: knowledge graph, standard details, version intelligence."""

from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login

TENDER = b"""3.1 Minimum operating pressure 10 bar.
3.2 Pump body of cast iron.
3.3 Tested as per IS 1520 : 2007.
3.4 Reinforced concrete works as per IS 456 : 1999.
"""


def _run(client, db_sessionmaker, h):
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    doc = client.post(f"{API}/documents", headers=h, files={"file": ("t.txt", TENDER, "text/plain")}).json()
    an = client.post(f"{API}/analyses", headers=h, json={"document_id": doc["id"], "sector": "mechanical"}).json()
    assert client.get(f"{API}/analyses/{an['id']}", headers=h).json()["status"] == "READY"
    return an["id"]


def test_demo_graph_seeded(client, db_sessionmaker):
    h = login(client)
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    # Standard details include versions, amendments, relationships.
    is1520 = client.get(f"{API}/standards?q=1520", headers=h).json()[0]
    detail = client.get(f"{API}/standards/{is1520['id']}", headers=h).json()
    assert any(v["is_current"] for v in detail["versions"])
    assert any(not v["is_current"] for v in detail["versions"])  # 1980 superseded
    assert detail["relationships"]  # has typed edges
    assert all(r["data_origin"] == "DEMO_SYNTHETIC" for r in detail["relationships"])

    is456 = client.get(f"{API}/standards?q=456", headers=h).json()[0]
    d456 = client.get(f"{API}/standards/{is456['id']}", headers=h).json()
    assert len(d456["amendments"]) == 2
    assert d456["amendments"][0]["affected_clauses"]


def test_analysis_graph_and_edge_detail(client, db_sessionmaker):
    h = login(client)
    analysis_id = _run(client, db_sessionmaker, h)

    g = client.get(f"{API}/analyses/{analysis_id}/graph", headers=h).json()
    numbers = {n["is_number"] for n in g["nodes"]}
    assert "IS 1520 : 2007" in numbers
    # 1-hop neighbours of the recommended pump standard appear (material/testing/normative).
    assert numbers & {"IS 210 : 2009", "IS 5120 : 1977", "IS 3624 : 1987"}
    assert g["edges"], "expected typed relationships in the subgraph"

    edge = g["edges"][0]
    detail = client.get(f"{API}/graph/edges/{edge['id']}", headers=h).json()
    assert detail["relationship_type"]
    assert detail["evidence"] is not None  # edge resolves to stored evidence
    assert detail["from"] and detail["to"]


def test_neighbourhood_query(client, db_sessionmaker):
    h = login(client)
    db = db_sessionmaker(); seed_demo_standards(db); db.close()
    is1520 = client.get(f"{API}/standards?q=1520", headers=h).json()[0]
    nb = client.get(f"{API}/graph/standards/{is1520['id']}?depth=1", headers=h).json()
    assert len(nb["nodes"]) >= 2 and nb["edges"]
    # Type filter restricts edges.
    mat = client.get(f"{API}/graph/standards/{is1520['id']}?depth=1&types=MATERIAL", headers=h).json()
    assert all(e["relationship_type"] == "MATERIAL" for e in mat["edges"])


def test_version_intelligence(client, db_sessionmaker):
    h = login(client)
    analysis_id = _run(client, db_sessionmaker, h)
    findings = client.get(f"{API}/analyses/{analysis_id}/versions", headers=h).json()
    by_num = {f["is_number"]: f for f in findings if f["is_number"]}
    # IS 1520 : 2007 referenced == current → OK.
    assert by_num["IS 1520 : 2007"]["discrepancy_type"] == "OK"
    # IS 456 referenced as :1999 but current is 2000 → OUTDATED.
    assert by_num["IS 456 : 2000"]["discrepancy_type"] == "OUTDATED"
    # Every finding carries tender evidence.
    assert all(f["evidence"]["text"] for f in findings)
