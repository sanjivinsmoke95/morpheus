"""Serverless / Vercel+Supabase adapters."""

from unittest.mock import Mock, patch

from app.core.config import normalize_database_url
from app.services.object_store import SupabaseObjectStore, reset_object_store
from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login


def test_normalize_supabase_database_url():
    raw = "postgresql://postgres:secret@db.abcdefgh.supabase.co:5432/postgres"
    out = normalize_database_url(raw)
    assert out.startswith("postgresql+psycopg2://")
    assert "sslmode=require" in out

    pooled = "postgres://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    out2 = normalize_database_url(pooled)
    assert "+psycopg2" in out2
    assert "sslmode=require" in out2


def test_deferred_pipeline_completes_on_poll(client, db_sessionmaker, monkeypatch):
    monkeypatch.setenv("MORPHEUS_SERVERLESS", "1")

    db = db_sessionmaker()
    seed_demo_standards(db)
    db.close()
    h = login(client)
    r = client.post(
        f"{API}/documents",
        headers=h,
        files={"file": ("tender.txt", b"3.1 Operating pressure 10 bar.\n", "text/plain")},
    )
    assert r.status_code == 201
    created = client.post(f"{API}/analyses", headers=h, json={"document_id": r.json()["id"], "sector": "mechanical"})
    assert created.status_code == 201
    analysis_id = created.json()["id"]
    assert created.json()["status"] == "QUEUED"

    status = "QUEUED"
    for _ in range(6):
        status = client.get(f"{API}/analyses/{analysis_id}", headers=h).json()["status"]
        if status in ("READY", "FAILED"):
            break
    assert status == "READY"


def test_supabase_object_store_put_get():
    reset_object_store()
    store = SupabaseObjectStore(
        url="https://example.supabase.co",
        key="service-role",
        bucket="morpheus",
    )
    with patch("app.services.object_store.httpx.post") as post, patch("app.services.object_store.httpx.get") as get:
        post.return_value = Mock(status_code=200, raise_for_status=lambda: None)
        get.return_value = Mock(status_code=200, content=b"hello", raise_for_status=lambda: None)
        store.put("documents/a.txt", b"hello")
        assert store.get("documents/a.txt") == b"hello"
        post.assert_called_once()
        assert "morpheus/documents/a.txt" in post.call_args.args[0]
    reset_object_store()
