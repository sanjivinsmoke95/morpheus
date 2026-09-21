"""Test harness: in-memory SQLite + TestClient with the DB dependency overridden.

Deterministic and offline (stub providers). No Postgres/Neo4j needed for Phase 1.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ["LLM_PROVIDER"] = "stub"
os.environ["EMBEDDING_PROVIDER"] = "stub"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db import Base, get_db
from app.main import app
from app.models import User
from app.models.enums import Role

API = "/api/v1"


@pytest.fixture
def db_sessionmaker():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    yield TestingSession
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_sessionmaker):
    def override_get_db():
        db = db_sessionmaker()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Seed one user per role directly.
    db = db_sessionmaker()
    for email, role in [("admin@example.com", Role.ADMIN), ("officer@example.com", Role.OFFICER), ("reviewer@example.com", Role.REVIEWER)]:
        db.add(User(email=email, full_name=role.value, password_hash=hash_password("password123"), role=role.value))
    db.commit()
    db.close()

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def login(client, email="officer@example.com", password="password123") -> dict:
    r = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
