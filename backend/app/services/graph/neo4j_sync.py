"""Optional Neo4j projection of the Postgres standards graph.

Postgres is the system of record; this projects standards + typed relationships
into Neo4j for large-scale traversal and is fully rebuildable. It is best-effort:
if Neo4j is not configured or unreachable, the app logs and continues (the API
reads Postgres). Runs only when NEO4J_URI is set.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Standard, StandardRelationship

logger = logging.getLogger(__name__)

_CONSTRAINTS = [
    "CREATE CONSTRAINT std_id IF NOT EXISTS FOR (s:Standard) REQUIRE s.id IS UNIQUE",
]


def project_to_neo4j(db: Session) -> dict:
    if not settings.neo4j_uri:
        return {"status": "not_configured"}
    try:
        from neo4j import GraphDatabase

        driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))
        standards = list(db.execute(select(Standard)).scalars())
        rels = list(db.execute(select(StandardRelationship)).scalars())
        with driver.session() as s:
            for c in _CONSTRAINTS:
                s.run(c)
            for std in standards:
                s.run(
                    "MERGE (n:Standard {id:$id}) SET n.is_number=$isn, n.title=$title, "
                    "n.status=$status, n.sector=$sector, n.data_origin=$origin",
                    id=std.id, isn=std.is_number, title=std.title, status=std.status,
                    sector=std.sector, origin=std.data_origin)
            for r in rels:
                s.run(
                    "MATCH (a:Standard {id:$f}),(b:Standard {id:$t}) "
                    "MERGE (a)-[e:REL {rid:$rid}]->(b) "
                    "SET e.type=$rtype, e.confidence=$conf, e.source=$src, e.data_origin=$origin, e.evidence_id=$ev",
                    f=r.from_standard_id, t=r.to_standard_id, rid=r.id, rtype=r.relationship_type,
                    conf=r.relationship_confidence, src=r.source_name, origin=r.data_origin, ev=r.evidence_id)
        driver.close()
        return {"status": "ok", "nodes": len(standards), "edges": len(rels)}
    except Exception as exc:  # noqa: BLE001 — projection is best-effort
        logger.warning("Neo4j projection skipped: %s", exc)
        return {"status": "unavailable", "detail": str(exc)[:200]}
