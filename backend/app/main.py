"""MORPHEUS API — Phase 1 foundation.

Wires config, logging, DB, auth, health, and the typed error envelope. In dev it
creates tables and seeds users; production uses Alembic migrations.
"""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routers import (
    admin, advanced, analyses, audit, auth, documents, evaluation, graph,
    recommendations, regulatory, reports, requirements, reviews, standards,
)
from app.core.config import settings
from app.core.logging import configure_logging
from app.db import Base, SessionLocal, engine

logger = logging.getLogger(__name__)

_CODE_BY_STATUS = {
    400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND",
    409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA",
    422: "VALIDATION_ERROR", 429: "RATE_LIMITED", 500: "INTERNAL", 502: "UPSTREAM_AI_ERROR",
}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    logger.info("Starting %s (%s)", settings.app_name, settings.environment)
    if settings.environment in ("development", "test"):
        Base.metadata.create_all(bind=engine)
        if settings.environment == "development":
            from app.core.seed import seed_users
            from app.services.standards.seed import seed_demo_standards

            with SessionLocal() as db:
                seed_users(db)
                seed_demo_standards(db)
                from app.services.evaluation.harness import run_evaluation
                run_evaluation(db)  # compute baseline metrics on the gold set
    yield
    logger.info("Shutting down")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    description="Procurement Specification Intelligence for the Indian Standards ecosystem.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status_code: int, message: str, details: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": _CODE_BY_STATUS.get(status_code, "ERROR"),
                "message": message,
                "details": details or {},
                "trace_id": str(uuid.uuid4()),
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def _http_exc(_: Request, exc: StarletteHTTPException):
    return _error(exc.status_code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def _validation_exc(_: Request, exc: RequestValidationError):
    return _error(422, "Request validation failed", {"errors": jsonable_encoder(exc.errors())})


@app.get("/health", tags=["health"])
def liveness() -> dict:
    """Public liveness probe (no auth). Detailed component health is /admin/health."""
    return {"status": "ok", "app": settings.app_name, "version": "0.1.0"}


api = settings.api_prefix
app.include_router(auth.router, prefix=api)
app.include_router(admin.router, prefix=api)
app.include_router(documents.router, prefix=api)
app.include_router(analyses.router, prefix=api)
app.include_router(requirements.router, prefix=api)
app.include_router(recommendations.router, prefix=api)
app.include_router(reviews.router, prefix=api)
app.include_router(reports.router, prefix=api)
app.include_router(graph.router, prefix=api)
app.include_router(standards.router, prefix=api)
app.include_router(audit.router, prefix=api)
app.include_router(regulatory.router, prefix=api)
app.include_router(advanced.router, prefix=api)
app.include_router(evaluation.router, prefix=api)
