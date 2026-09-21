"""Knowledge-graph queries.

Reads the authoritative relationships from Postgres (the system of record), so it
works everywhere including the SQLite test DB. When NEO4J_URI is configured, the
same data is also projected to Neo4j for large-scale traversal (neo4j_sync);
the API result shape is identical either way (knowledge-graph.md).
"""

from __future__ import annotations

from collections import deque

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import (
    Evidence, Recommendation, Standard, StandardAmendment, StandardRelationship, StandardVersion,
)


def _node(std: Standard) -> dict:
    return {"id": std.id, "is_number": std.is_number, "title": std.title,
            "status": std.status, "sector": std.sector, "data_origin": std.data_origin}


def _edge(rel: StandardRelationship) -> dict:
    return {"id": rel.id, "from": rel.from_standard_id, "to": rel.to_standard_id,
            "relationship_type": rel.relationship_type, "relationship_confidence": rel.relationship_confidence,
            "source_name": rel.source_name, "data_origin": rel.data_origin, "evidence_id": rel.evidence_id}


def _relationships_within(db: Session, node_ids: set[str]) -> list[StandardRelationship]:
    if not node_ids:
        return []
    rels = db.execute(
        select(StandardRelationship).where(
            StandardRelationship.from_standard_id.in_(node_ids),
            StandardRelationship.to_standard_id.in_(node_ids),
        )
    ).scalars().all()
    return list(rels)


def analysis_graph(db: Session, analysis_id: str) -> dict:
    """Subgraph of the standards recommended for an analysis + their 1-hop neighbours."""
    rec_std_ids = set(db.execute(
        select(Recommendation.standard_id).where(
            Recommendation.analysis_id == analysis_id, Recommendation.excluded == False)  # noqa: E712
    ).scalars())
    if not rec_std_ids:
        return {"nodes": [], "edges": []}

    # One hop out from recommended standards.
    neighbours: set[str] = set()
    for rel in db.execute(select(StandardRelationship).where(
        or_(StandardRelationship.from_standard_id.in_(rec_std_ids),
            StandardRelationship.to_standard_id.in_(rec_std_ids)))).scalars():
        neighbours.add(rel.from_standard_id)
        neighbours.add(rel.to_standard_id)
    node_ids = rec_std_ids | neighbours

    standards = db.execute(select(Standard).where(Standard.id.in_(node_ids))).scalars().all()
    nodes = [{**_node(s), "recommended": s.id in rec_std_ids} for s in standards]
    edges = [_edge(r) for r in _relationships_within(db, node_ids)]
    return {"nodes": nodes, "edges": edges}


def neighborhood(db: Session, standard_id: str, depth: int = 2, types: list[str] | None = None) -> dict:
    """BFS neighbourhood around a standard, bounded by depth and optional edge types."""
    visited = {standard_id}
    frontier = deque([(standard_id, 0)])
    edges_seen: dict[str, StandardRelationship] = {}
    while frontier:
        sid, d = frontier.popleft()
        if d >= depth:
            continue
        rels = db.execute(select(StandardRelationship).where(
            or_(StandardRelationship.from_standard_id == sid, StandardRelationship.to_standard_id == sid))).scalars()
        for rel in rels:
            if types and rel.relationship_type not in types:
                continue
            edges_seen[rel.id] = rel
            other = rel.to_standard_id if rel.from_standard_id == sid else rel.from_standard_id
            if other not in visited:
                visited.add(other)
                frontier.append((other, d + 1))
    standards = db.execute(select(Standard).where(Standard.id.in_(visited))).scalars().all()
    return {"nodes": [_node(s) for s in standards], "edges": [_edge(r) for r in edges_seen.values()]}


def edge_detail(db: Session, relationship_id: str) -> dict | None:
    rel = db.get(StandardRelationship, relationship_id)
    if not rel:
        return None
    frm = db.get(Standard, rel.from_standard_id)
    to = db.get(Standard, rel.to_standard_id)
    ev = db.get(Evidence, rel.evidence_id) if rel.evidence_id else None
    return {
        "id": rel.id, "relationship_type": rel.relationship_type,
        "from": {"is_number": frm.is_number, "title": frm.title} if frm else None,
        "to": {"is_number": to.is_number, "title": to.title} if to else None,
        "note": rel.note, "relationship_confidence": rel.relationship_confidence,
        "source_name": rel.source_name, "source_url": rel.source_url, "data_origin": rel.data_origin,
        "verification_status": rel.verification_status,
        "evidence": {"id": ev.id, "source_type": ev.source_type, "text": ev.text,
                     "data_origin": ev.data_origin} if ev else None,
    }


def standard_details(db: Session, is_number: str) -> dict | None:
    std = db.execute(select(Standard).where(Standard.is_number == is_number)).scalar_one_or_none()
    if not std:
        return None
    versions = db.execute(select(StandardVersion).where(StandardVersion.standard_id == std.id)).scalars().all()
    amendments = db.execute(select(StandardAmendment).where(StandardAmendment.standard_id == std.id)).scalars().all()
    out_rels = db.execute(select(StandardRelationship).where(StandardRelationship.from_standard_id == std.id)).scalars().all()
    in_rels = db.execute(select(StandardRelationship).where(StandardRelationship.to_standard_id == std.id)).scalars().all()
    other = {s.id: s for s in db.execute(select(Standard)).scalars()}

    def rel_view(r: StandardRelationship, direction: str) -> dict:
        target = other.get(r.to_standard_id if direction == "out" else r.from_standard_id)
        return {"id": r.id, "relationship_type": r.relationship_type, "direction": direction,
                "target_is_number": target.is_number if target else "", "target_title": target.title if target else "",
                "confidence": r.relationship_confidence, "source_name": r.source_name, "data_origin": r.data_origin}

    return {
        "standard": _node(std),
        "scope": std.scope, "current_version": std.current_version, "publication_year": std.publication_year,
        "source_url": std.source_url, "source_name": std.source_name, "retrieved_at": std.retrieved_at,
        "verification_status": std.verification_status,
        "versions": [{"version_label": v.version_label, "is_current": v.is_current, "notes": v.notes,
                      "effective_date": v.effective_date.isoformat() if v.effective_date else None,
                      "data_origin": v.data_origin} for v in versions],
        "amendments": [{"amendment_no": a.amendment_no,
                        "amendment_date": a.amendment_date.isoformat() if a.amendment_date else None,
                        "affected_clauses": a.affected_clauses, "summary": a.summary,
                        "data_origin": a.data_origin} for a in amendments],
        "relationships": [rel_view(r, "out") for r in out_rels] + [rel_view(r, "in") for r in in_rels],
    }
