# MORPHEUS — Knowledge Graph (Neo4j)

> Neo4j is a **projection** of the authoritative Postgres data, optimized for
> traversal and the interactive React Flow view. It holds **no unique data**: it
> is rebuilt from `standards` + `standard_relationships` (+ versions/amendments)
> and can be dropped and re-synced at any time. Every edge carries its source and
> evidence references so a click in the UI resolves to stored metadata.

## 1. Why a graph at all

Procurement auditing is a **traversal** problem: "which testing/safety/material
standards does this directly-applicable standard pull in, and do the tender's
requirements cover them?" Multi-hop relationship queries (normative closure,
supersession chains, amendment reach) are awkward in SQL and natural in Cypher.
Postgres remains the system of record; Neo4j accelerates the questions the audit
engines and the graph screen ask.

## 2. Node & relationship model

```
(:Standard { id, is_number, is_number_normalized, title, status,
             sector, data_origin, current_version })
(:Amendment { id, amendment_no, amendment_date, data_origin })
(:Version   { id, version_label, effective_date, is_current })

(:Standard)-[:REFERENCES        { rid, confidence, source_name, evidence_ids, data_origin }]->(:Standard)
(:Standard)-[:NORMATIVE_REFERENCE{ … }]->(:Standard)
(:Standard)-[:TESTING           { … }]->(:Standard)
(:Standard)-[:SAFETY            { … }]->(:Standard)
(:Standard)-[:MATERIAL          { … }]->(:Standard)
(:Standard)-[:INSTALLATION      { … }]->(:Standard)
(:Standard)-[:CERTIFICATION     { … }]->(:Standard)
(:Standard)-[:RELATED_TO        { … }]->(:Standard)
(:Standard)-[:SUPERSEDES        { … }]->(:Standard)
(:Standard)-[:SUPERSEDED_BY     { … }]->(:Standard)
(:Standard)-[:AMENDS]->(:Amendment)          # or (:Amendment)-[:AMENDS]->(:Standard)
(:Standard)-[:HAS_VERSION]->(:Version)
```

`rid` on every relationship is the Postgres `standard_relationships.id`, so an
edge in the graph maps 1:1 to an authoritative (or clearly `DEMO_SYNTHETIC`) row.
Relationships are **not all equal**: `confidence` and `data_origin` on the edge
let the UI style a curated/authoritative edge differently from a demo one, and let
the audit engine weight them.

## 3. Constraints & sync

```cypher
CREATE CONSTRAINT std_id  IF NOT EXISTS FOR (s:Standard)  REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT std_isn IF NOT EXISTS FOR (s:Standard)  REQUIRE s.is_number IS UNIQUE;
CREATE CONSTRAINT amd_id  IF NOT EXISTS FOR (a:Amendment) REQUIRE a.id IS UNIQUE;
```

**Sync** (`services/graph`): on standard/relationship create/update the service
upserts the corresponding node/edge (transactional outbox pattern: Postgres write
+ enqueue graph upsert; a reconciler can full-rebuild from Postgres). Admin
`/admin/ingestion` shows sync lag. Because the graph is derivable, a divergence is
resolved by re-projecting, never by trusting Neo4j.

## 4. Queries the system runs

```cypher
// Normative + testing closure of a directly-applicable standard (depth-bounded)
MATCH p = (s:Standard {is_number:$isn})
          -[:NORMATIVE_REFERENCE|TESTING|SAFETY|MATERIAL*1..3]->(dep:Standard)
RETURN dep, relationships(p);

// Supersession chain (version intelligence)
MATCH (s:Standard {is_number:$isn})-[:SUPERSEDED_BY*1..]->(newer:Standard)
RETURN newer ORDER BY newer.current_version;

// Analysis subgraph: standards recommended for this analysis + 1-hop neighbours
MATCH (s:Standard) WHERE s.id IN $recommended_ids
OPTIONAL MATCH (s)-[r]->(n:Standard)
RETURN s, r, n;
```

The **graph screen** (`/analyses/:id/graph`) renders the analysis subgraph:
recommended standards as primary nodes, their typed neighbours one hop out. Node
click → `GET /standards/:isNumber`; edge click → `GET /graph/edges/:id` returning
the relationship's `source_name`, `data_origin`, `confidence`, and `evidence[]`.
Nothing is synthesized on interaction.

## 5. Graph's role in the audit

- **Coverage**: from each directly-applicable standard, traverse `TESTING`,
  `SAFETY`, `MATERIAL`, `INSTALLATION`, `NORMATIVE_REFERENCE` edges to enumerate
  the standards a complete spec would engage; compare against tender requirements
  → `coverage_results`.
- **Version**: `SUPERSEDES`/`SUPERSEDED_BY` chains detect outdated references.
- **Amendment**: `AMENDS` links a standard to amendment nodes whose
  `affected_clauses` feed amendment-impact findings (where data exists).
- **Why-not / alternatives**: sibling `RELATED_TO` nodes with weaker signals
  become "alternatives"; a candidate related only by `RELATED_TO` (not
  `DIRECTLY_APPLICABLE`) is explained as such.

## 6. Testing without a live graph

Graph logic is covered by (a) Cypher integration tests against a Neo4j test
container, and (b) a thin `GraphPort` interface so unit tests of the audit engines
use an in-memory adjacency fake. The audit engines depend on `GraphPort`, not on
Neo4j directly, keeping them unit-testable and the store swappable.
