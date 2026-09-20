# MORPHEUS

**AI-powered Procurement Specification Intelligence for the Indian Standards ecosystem.**

MORPHEUS does not merely *find* Indian Standards. It **audits a procurement
specification** against the standards ecosystem: it understands the spec, extracts
structured requirements, maps them to applicable standards, traces
normative/testing/safety/material/certification relationships, checks versions and
amendments, detects gaps and conflicts, grounds every finding in evidence, lets an
officer verify, and generates a procurement-ready report.

> **Core principle.** AI understands · Search discovers · The knowledge graph
> connects · Rules validate · Evidence supports · **The officer decides.**
>
> The LLM never invents a standard number, clause, QCO, or legal status. When
> evidence is insufficient, the system **abstains** for human review. Demo data is
> labelled `DEMO_SYNTHETIC` and can never present as official BIS data.

## Status — Phase 0 (architecture)

No application code yet. This repo currently contains the architecture that must
be approved before Phase 1 begins.

## Documents

| Doc | Contents |
|---|---|
| [architecture.md](docs/architecture.md) | System overview, canonical enums, components, orchestrator, folder + route map, feature dependency graph |
| [database-schema.md](docs/database-schema.md) | PostgreSQL + pgvector ERD and all table definitions |
| [api-contracts.md](docs/api-contracts.md) | REST endpoints, typed contracts, error model, RBAC per route |
| [ai-pipeline.md](docs/ai-pipeline.md) | LLM/embedding abstraction, stage-by-stage pipeline, guardrails, abstention |
| [knowledge-graph.md](docs/knowledge-graph.md) | Neo4j node/edge model as a rebuildable projection of Postgres |
| [search-ranking.md](docs/search-ranking.md) | BM25 / vector / hybrid fusion, transparent signals, relevance bands, evaluation |
| [evidence-model.md](docs/evidence-model.md) | Evidence as a first-class entity; grounding, confidence, snapshots |
| [security.md](docs/security.md) | RBAC, auth, upload safety, audit, and lawful BIS data-use |
| [testing-strategy.md](docs/testing-strategy.md) | Test layers, per-component tests, E2E acceptance, anti-fake CI guards |
| [implementation-plan.md](docs/implementation-plan.md) | Phases 0–8, sequence, Definition of Done, risks, data dependencies |

## Intended stack

React + TypeScript + Vite + Tailwind + TanStack Query + React Flow + Recharts ·
FastAPI + Pydantic + SQLAlchemy + Alembic · PostgreSQL + pgvector · Neo4j ·
PyMuPDF / python-docx / Tesseract · provider-abstracted LLM + embeddings ·
ReportLab / python-docx · Docker Compose.

## Next step

Review the Phase 0 gate questions in
[implementation-plan.md §8](docs/implementation-plan.md). On approval, Phase 1
(foundation) begins — not before.
