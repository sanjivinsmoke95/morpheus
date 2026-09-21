"""Neo4j connectivity (health only in Phase 1).

The graph is a projection built in Phase 3; here we only need to report whether
it is configured and reachable, without making it a hard dependency.
"""

from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def graph_status() -> dict:
    if not settings.neo4j_uri:
        return {"status": "not_configured"}
    try:
        from neo4j import GraphDatabase  # lazy: optional in Phase 1

        driver = GraphDatabase.driver(
            settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
        )
        try:
            driver.verify_connectivity()
            return {"status": "ok"}
        finally:
            driver.close()
    except Exception as exc:  # noqa: BLE001 — health must never raise
        logger.warning("Neo4j health check failed: %s", exc)
        return {"status": "unavailable", "detail": str(exc)[:200]}
