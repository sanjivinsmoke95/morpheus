"""Engine + session factory + FastAPI DB dependency."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import is_serverless, settings

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

_engine_kwargs: dict = {
    "connect_args": _connect_args,
    "pool_pre_ping": True,
    "future": True,
}
if is_serverless() or "pooler.supabase.com" in settings.database_url:
    # No persistent connections: Vercel functions + Supabase transaction pooler (pgbouncer).
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
