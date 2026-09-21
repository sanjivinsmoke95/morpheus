"""Test harness.

Uses a shared FILE-based SQLite DB so the API request sessions, the orchestrator's
background-task session (its own SessionLocal), and any direct session all see the
same data — which lets the real end-to-end pipeline (including background tasks)
run in tests. Deterministic and offline (stub providers).
"""

import os
import pathlib

_DB_PATH = pathlib.Path(__file__).parent / "_pytest.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_DB_PATH}")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ["LLM_PROVIDER"] = "stub"
os.environ["EMBEDDING_PROVIDER"] = "stub"

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import User
from app.models.enums import Role

API = "/api/v1"


@pytest.fixture
def db_sessionmaker():
    return SessionLocal


@pytest.fixture
def client(db_sessionmaker):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    for email, role in [("admin@example.com", Role.ADMIN), ("officer@example.com", Role.OFFICER),
                        ("reviewer@example.com", Role.REVIEWER)]:
        db.add(User(email=email, full_name=role.value, password_hash=hash_password("password123"), role=role.value))
    db.commit()
    db.close()

    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


def login(client, email="officer@example.com", password="password123") -> dict:
    r = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
