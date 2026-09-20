# MORPHEUS — Implementation Plan

> Build order, Definition of Done, technical risks, and data dependencies. No
> implementation begins until this architecture is approved (Phase 0 gate).

## 1. Phased plan (maps to spec §21)

| Phase | Deliverable | Exit criterion |
|---|---|---|
| **0 Architecture** _(this)_ | these `/docs`, ERD, contracts, pipelines, graph, risks | internally consistent, approved |
| **1 Foundation** | monorepo, docker-compose (pg+pgvector, neo4j), Alembic, auth + RBAC, base FE/BE, health checks, provider abstraction with offline fallback | `GET /admin/health` green; login works; migrations apply; CI runs |
| **2 Vertical slice** | upload → extract → requirements → **normalize** → hybrid retrieve → rank → evidence → recommendation → review → report, on demo data | E2E test of the slice passes; edit-requirement changes results; report downloads |
| **3 Standards intelligence** | Neo4j projection + graph screen, relationships, versions, amendments, standard details | edge click resolves to stored evidence; supersession + amendment queries tested |
| **4 Procurement audit** | coverage matrix, gap detection, conflict detection, readiness dashboard, why-not, alternatives | conflict + gap on fixtures are real engine output; readiness reflects decisions |
| **5 Regulatory** | QCO + certification (external data), amendment impact | status shown only from stored authoritative records; abstains otherwise |
| **6 Advanced** | HS-code signal, multilingual (EN/HI/TE), historical comparison, spec copilot (draft-only), feedback capture | copilot drafts labelled + evidence-linked; multilingual preserves normalized values |
| **7 Evaluation** | gold set + harness + dashboard comparing keyword/vector/hybrid/Morpheus | metrics computed by harness only; baselines comparable |
| **8 Demo hardening** | real/scanned/malformed/contradictory docs; AI/DB/graph failure paths | graceful typed errors + REVIEW_REQUIRED; no fabricated fills |

**Rule:** do not advance while the previous phase's exit criterion is unmet. The
vertical slice (Phase 2) must fully work before any Phase 3+ breadth.

## 2. Implementation sequence (within Phase 2, the critical path)

```
1  DB models + migrations for: users, documents, document_pages, analyses,
   requirements, requirement_attributes, standards, standard_chunks, evidence,
   recommendations, recommendation_evidence, reviews, review_decisions, reports
2  Ingestion service (pdf/docx/txt) + page model + OCR fallback  [+tests]
3  Demo standards dataset (labelled) + embeddings + FTS/HNSW indexes
4  Requirement extraction (LLM→JSON, offline fallback) + normalization  [+tests]
5  Retrieval: BM25, vector, hybrid fusion + signals  [+tests, +eval stub]
6  Applicability classifier (LLM propose + rule gate) + evidence assembly  [+tests]
7  Recommendations API + traceability persistence
8  Frontend: upload → processing(SSE) → requirement matrix(editable) →
   recommendations(evidence, why-not) → review
9  Report generator (PDF+DOCX) from persisted analysis
10 E2E test of the whole slice; partial re-analysis on requirement edit
```

## 3. Feature dependency graph

```
[Auth/RBAC][Docker/DB] → [Ingestion] → [Extraction] → [Normalization]
[Demo standards+embeddings] → [Retrieval] → [Ranking] → [Applicability]+[Evidence] → [Recommendations]
[Recommendations] → [Review] → [Report] → [History]
[Standards+Relationships] → [Graph] → [Coverage]; [Graph] → [Version]/[Amendment]
[Normalization]+[Requirements] → [Conflict]
[Coverage]+[Gap]+[Conflict]+[Version]+[Certification] → [Readiness Dashboard]
[QCO/Certification data] → [Regulatory findings] → [Readiness]/[Report]
[Gold set] → [Evaluation harness] → [Evaluation dashboard]
```

## 4. Definition of Done (per feature — spec §22)

A feature ships only when **all** hold:
1. UI screen with loading/error/empty/retry states.
2. API endpoint with typed contract + OpenAPI entry.
3. DB persistence where required (result survives refresh).
4. **Real processing** (no hard-coded/faked output for real input).
5. Error handling (typed errors; abstain on insufficient evidence).
6. Tests (unit + integration; E2E where on the critical path).
7. End-to-end integration works.
8. User can verify the result (evidence shown where applicable).
9. Evidence available where applicable.
10. Documentation updated.

CI enforces 2, 6, and the anti-fake guards (`testing-strategy.md §4`).

## 5. Technical risks & mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Authoritative BIS data availability** (no documented API; copyright) | limits real standards/QCO coverage | design around admin-curated + permitted metadata; ship labelled DEMO_SYNTHETIC; never scrape PDFs; `data_origin` everywhere |
| R2 | LLM hallucinates standard numbers / authority | wrong/illegal claims | standard-number validator, evidence guard, rule-gated classification, abstention |
| R3 | Extraction quality on messy/scanned tenders | garbage-in | OCR confidence surfaced; low-confidence flagged; officer edits + re-analysis; tests on scanned fixtures |
| R4 | Unit/parameter normalization errors | false/missed conflicts | deterministic unit registry, extensive normalization tests, review status on uncertain |
| R5 | Retrieval relevance | poor recommendations | three baselines + tunable transparent weights + eval harness to measure, not guess |
| R6 | Graph/Postgres divergence | stale graph | Neo4j is a rebuildable projection; reconciler; sync-lag visible in admin |
| R7 | Multilingual technical terms | lost meaning | preserve normalized values as language-independent; test EN/HI/TE; architecture allows more languages |
| R8 | Cost/latency of LLM+embeddings | slow/expensive analyses | temperature 0, batching, per-analysis budget, resumable orchestrator, caching embeddings |
| R9 | Overclaiming accuracy | trust/compliance failure | confidence is labelled system-relevance; metrics only from gold set; "no fabricated accuracy" in CI |
| R10 | Provider lock-in | fragility | LLM/embedding behind interfaces; offline fallback; model+dim recorded for safe swaps |

## 6. Data dependencies

| Data | Needed for | Source | If unavailable |
|---|---|---|---|
| Standards catalogue (numbers, titles, scope, sector, keywords) | retrieval, recommendations | admin-curated / permitted metadata | DEMO_SYNTHETIC seed (labelled) |
| Standard relationships (typed, evidenced) | graph, coverage, version, why-not | admin-curated | demo relationships (labelled) |
| Versions / supersession | version intelligence | admin-curated / permitted metadata | abstain (UNKNOWN) per reference |
| Amendments + affected clauses | amendment impact | admin-curated | abstain; no interpretation |
| QCO records | certification intelligence | authoritative order text (admin) | status UNKNOWN; abstain |
| Certification schemes | certification findings | authoritative (admin) | UNKNOWN; abstain |
| Labelled gold set | evaluation | authored (DEMO_SYNTHETIC) | eval dashboard shows "no gold data" |
| Historical tenders | historical comparison | user's own prior uploads | feature empty until data exists |

## 7. Features that REQUIRE external/authoritative data (cannot be faked)

These are built end-to-end but **abstain** without real data, and never fabricate:
- Certification / QCO intelligence (regulatory status).
- Amendment impact analysis (needs amendment + affected-clause data).
- Authoritative version/supersession assertions (curated version data).
- "Mandatory" gap claims (need authoritative basis; otherwise reported as
  *potential* gaps only).
Everything else (ingestion, extraction, normalization, retrieval, ranking,
applicability, evidence, coverage vs available data, conflict detection, review,
reports, graph over available relationships, evaluation on the gold set) works on
the demo dataset **and** on real user uploads without external data.

## 8. Phase 0 gate — what to review

1. Are the canonical enums (`architecture.md §2`) sufficient and used consistently
   across schema, API, and pipeline? 
2. Is the Postgres-vs-Neo4j split (system-of-record vs projection) acceptable?
3. Is the hybrid ranking transparent enough, and are relevance **bands** (not
   probabilities) the right UX?
4. Are the abstention rules and evidence-grounding guards strict enough for the
   "no fabricated authority/accuracy" requirement?
5. Is the demo-vs-authoritative (`data_origin`) separation clear enough for
   compliance?
6. Is the phased sequence (vertical slice before breadth) the right risk order?

**On approval → begin Phase 1.** Not before.
