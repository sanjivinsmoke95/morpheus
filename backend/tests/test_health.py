from tests.conftest import API, login


def test_public_liveness(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_admin_health_requires_admin(client):
    officer = login(client, "officer@example.com")
    assert client.get(f"{API}/admin/health", headers=officer).status_code == 403


def test_admin_health_reports_components(client):
    admin = login(client, "admin@example.com")
    body = client.get(f"{API}/admin/health", headers=admin).json()
    comps = body["components"]
    assert comps["database"]["status"] == "ok"
    assert comps["object_store"]["status"] == "ok"
    # Stub providers: LLM unavailable (abstains), embedder available (deterministic).
    assert comps["llm_provider"]["available"] is False
    assert comps["embedding_provider"]["available"] is True
    assert comps["embedding_provider"]["dim"] == 768
    # Neo4j not configured in tests → reported, not crashing.
    assert comps["neo4j"]["status"] in ("not_configured", "unavailable")
    assert body["status"] == "ok"


def test_embedder_is_deterministic():
    from app.services.ai import get_embedder

    e = get_embedder()
    a = e.embed(["operating pressure 10 bar"])[0]
    b = e.embed(["operating pressure 10 bar"])[0]
    assert a == b and len(a) == e.dim
