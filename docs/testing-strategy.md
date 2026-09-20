# MORPHEUS — Testing Strategy

> A feature is done only when it is **tested and integrated** (see
> `implementation-plan.md §DoD`). Tests are the guard against the project's
> biggest risk: a UI that looks real but isn't. Every core feature has real
> processing exercised by tests.

## 1. Layers

| Layer | Scope | Tooling | Runs against |
|---|---|---|---|
| Unit | pure logic: normalization, fusion, rule gates, coverage/gap/conflict, confidence mapping | pytest | in-memory fakes |
| Contract | Pydantic schema validity; OpenAPI ↔ generated TS types in sync | pytest + `openapi-typescript` diff | — |
| Integration | routers + DB; pgvector retrieval; Neo4j Cypher; report bytes | pytest + testcontainers (pg+pgvector, neo4j) | real stores |
| AI (offline) | extraction/classification/explanation with the deterministic fallback provider | pytest | fake provider |
| E2E | full pipeline upload→report; frontend flows | pytest (API E2E) + Playwright (UI) | docker-compose test stack |
| Evaluation | retrieval/applicability/gap metrics on the gold set | eval harness | `evaluation_cases` |

## 2. Per-component tests (mapped to spec §20)

- **Document ingestion / PDF / DOCX**: known fixture files → expected page count,
  text, section markers.
- **OCR fallback**: a scanned-image PDF fixture → `ocr_used=true`, non-empty text,
  recorded `ocr_confidence`.
- **Requirement extraction schema**: fake provider returns fixed JSON → validated
  `requirements` + `attributes`; malformed JSON → retry → `REVIEW_REQUIRED`
  (no crash).
- **Search**: BM25 finds an exact-term standard; vector finds a paraphrase; hybrid
  outranks either alone on a crafted case; weights honored.
- **Embedding retrieval**: cosine ordering correct; model/dim recorded; mismatch
  guarded.
- **Hybrid ranking**: `signals_json` populated; band thresholds; deterministic
  order given fixed embeddings.
- **Applicability classification**: rule gate overrides LLM (normative-only edge
  can't become DIRECTLY_APPLICABLE; no-evidence capped at LOW; bad evidence id →
  REVIEW_REQUIRED).
- **Evidence linkage**: every persisted recommendation/gap/conflict has required
  roles; `assert_grounded` blocks ungrounded HIGH/MEDIUM.
- **Graph relationships**: Cypher upsert + neighborhood/closure/supersession
  queries; edge click resolves to stored row.
- **Version detection**: referenced version vs current → OUTDATED/SUPERSEDED/
  UNKNOWN/OK; unknown standard number → UNKNOWN + review.
- **Amendment detection**: amendment present → finding with affected clauses;
  absent → abstain (no fabricated interpretation).
- **Gap detection**: standard expects a testing requirement the tender lacks →
  `MISSING`; distinguishes missing/partial/full/unknown; no false "mandatory"
  without authoritative evidence.
- **Conflict detection**: voltage 230 V vs 415 V across sections → one HIGH
  `TECHNICAL_PARAMETER` conflict with both sources; unit normalization (e.g.
  10 bar vs 1 MPa recognized as equal, not a conflict).
- **Review workflow**: decision persists; `review_status` updates; snapshot
  stored; survives refresh.
- **Report generation**: PDF and DOCX produced; contain required sections,
  evidence, and officer decisions; checksum stable for same input.
- **Auth / authz**: login, hashing, RBAC per route (officer blocked from admin
  standard edits; unauthenticated blocked).
- **API validation**: bad payloads → typed 422; oversize/wrong-type upload →
  413/415 before processing.

## 3. End-to-end acceptance (spec §23)

A single E2E test drives the demo acceptance path and asserts **no hard-coded
values**:
```
login → upload real PDF → (OCR if scanned) → requirements extracted with source
page+confidence → edit one requirement → search reruns (result set changes) →
recommendations with triggering requirement + applicability + evidence + source →
graph explored (edge resolves to stored evidence) → version discrepancy (where
demo data supports) → ≥1 gap → conflict (on a contradictory fixture) →
accept/reject → decisions persist after reload → readiness updates → PDF & DOCX
report generated → history reopen.
```
The test uses the **DEMO_SYNTHETIC** dataset (labelled) plus a purpose-built
contradictory tender fixture; the contradiction and gap are real outputs of the
engines, not seeded results.

## 4. Anti-fake guards (CI)

- A lint/test that greps core service code for banned patterns (returning
  hard-coded recommendation/graph/confidence literals from a request handler).
- Contract test failing on stale generated TS types.
- Evaluation numbers only ever produced by the harness; a test asserts the
  `/evaluation` endpoint reads `evaluation_results` and has no write-metric path.
- Coverage thresholds on the audit engines and evidence guard.

## 5. Fixtures & data

`data/demo/` (labelled DEMO_SYNTHETIC) and `data/evaluation/` (gold cases) are
version-controlled. Binary document fixtures (small real-ish PDFs/DOCX, one
scanned) live under `backend/tests/fixtures/`. Testcontainers spin up pg+pgvector
and neo4j so integration tests use the real stores, not mocks.
