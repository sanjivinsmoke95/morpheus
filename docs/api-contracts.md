# MORPHEUS — API Contracts

> REST over FastAPI. OpenAPI 3.1 auto-generated from Pydantic; the frontend's
> typed Axios client is generated from that schema, so backend and frontend share
> one contract. The frontend never touches the DB directly. Enums are canonical
> (`architecture.md §2`). All routes except `/auth/login` require a Bearer JWT.

## Conventions

- Base path `/api/v1`. IDs are UUID strings. Times are ISO-8601 UTC.
- **Error envelope** (every non-2xx):
  ```json
  { "error": { "code": "REQUIREMENT_NOT_FOUND", "message": "human text",
               "details": {}, "trace_id": "uuid" } }
  ```
  Codes: `VALIDATION_ERROR`(422), `UNAUTHORIZED`(401), `FORBIDDEN`(403),
  `NOT_FOUND`(404), `CONFLICT`(409), `UNSUPPORTED_MEDIA`(415),
  `PAYLOAD_TOO_LARGE`(413), `RATE_LIMITED`(429), `UPSTREAM_AI_ERROR`(502),
  `INTERNAL`(500).
- **Pagination**: `?limit&offset` → `{ items, total, limit, offset }`.
- **RBAC** noted per route as `[roles]` (see `security.md`).

## /auth
```
POST /auth/login            {email,password} → {access_token, token_type, user}
GET  /auth/me               → User
POST /auth/logout           → 204            # token revocation list
```

## /documents  [OFFICER, REVIEWER, ADMIN]
```
POST   /documents           multipart file → Document           # validates type/size, checksums
GET    /documents/:id       → Document
GET    /documents/:id/pages → [DocumentPage]
```
Upload rejects non-allowlisted MIME/oversize with `UNSUPPORTED_MEDIA`/`PAYLOAD_TOO_LARGE`
**before** any processing.

## /analyses  [OFFICER, REVIEWER, ADMIN]
```
POST /analyses              {document_id, title, options?} → Analysis(status=QUEUED)
GET  /analyses              ?status&mine → paginated [AnalysisSummary]
GET  /analyses/:id          → Analysis (with status + stage_error)
GET  /analyses/:id/events   → text/event-stream (SSE) status transitions   # processing screen
POST /analyses/:id/rerun    {requirement_id?} → 202   # full or partial re-analysis
GET  /analyses/:id/readiness→ ReadinessScorecard
```

## /requirements  [OFFICER edits; REVIEWER, ADMIN read]
```
GET   /analyses/:id/requirements  ?type&min_confidence → [Requirement]
PATCH /requirements/:id     {description?,type?,attributes?[]} → Requirement
       # sets is_edited, versions the row, triggers partial rerun downstream
POST  /analyses/:id/requirements  {…}  → Requirement            # officer adds one
```
`Requirement` includes `attributes[]`, `source_page`, `source_section`,
`confidence`, and `evidence_ids[]`.

## /recommendations  [read: all; mutate via /reviews]
```
GET /analyses/:id/recommendations  ?requirement_id&class&relevance&include_excluded
    → [Recommendation]
GET /recommendations/:id           → Recommendation (full)
GET /recommendations/:id/why-not   → { signals, scope_mismatch, product_mismatch,
                                       parameter_mismatch, classification_reason }
GET /requirements/:id/alternatives → { primary, alternatives[], related[], differences[] }
```
`Recommendation` = `{ id, requirement_id, standard:{is_number,title}, applicability_class,
relevance, relevance_score, retrieval_method, signals, rationale, confidence,
evidence[], final_rank, is_primary, review_status, excluded, exclusion_reason }`.
`evidence[]` are full `Evidence` objects (never bare ids in the read model).

## /standards
```
GET /standards               ?q&sector&status&data_origin → paginated [StandardSummary]  [all]
GET /standards/:isNumber      → Standard (metadata, versions, amendments, relationships, evidence)
```

## /graph  [read: all]
```
GET /analyses/:id/graph      ?depth → { nodes:[GraphNode], edges:[GraphEdge] }
GET /graph/standards/:id     ?depth&types → neighborhood
GET /graph/edges/:id         → GraphEdge (with evidence + source metadata)
```
`GraphNode = {id,is_number,title,status,data_origin}`;
`GraphEdge = {id,from,to,relationship_type,relationship_confidence,source_name,evidence_ids}`.
Clicking a node/edge in the UI calls `/standards/:id` or `/graph/edges/:id` for
**stored** metadata — nothing is generated on click.

## Audit engines
```
GET /analyses/:id/coverage    → [CoverageResult]   (requirement→standard→CoverageClass→evidence)  [all]
GET /analyses/:id/gaps        → [Gap]              [all]
GET /analyses/:id/conflicts   → [Conflict]         [all]
GET /analyses/:id/versions    → [VersionFinding]   [all]
GET /analyses/:id/amendments  → [AmendmentFinding] [all]
GET /analyses/:id/certification → [CertificationRecord]  [all]
GET /analyses/:id/qco         → [QcoRecord]        [all]
```
Every item carries `evidence` and `status`; items lacking authoritative support
return `confidence=REVIEW_REQUIRED` and are surfaced, not hidden.

## /reviews  [OFFICER, REVIEWER]
```
GET  /analyses/:id/reviews    → Review + queue
POST /reviews                 {analysis_id} → Review
POST /reviews/:id/decisions   {target_type,target_id,decision,reason,
                               added_standard_is_number?} → ReviewDecision
       # persists ai_snapshot + evidence_snapshot; updates target.review_status
```
Decisions persist across refresh (they are rows, not client state) — a hard demo
acceptance requirement.

## /reports  [OFFICER, REVIEWER, ADMIN]
```
POST /reports                 {analysis_id, format:'PDF'|'DOCX', sections?[]} → Report
GET  /reports/:id             → Report (metadata + download_url)
GET  /reports/:id/download    → file stream
```

## /history, /feedback, /evaluation
```
GET  /history                 ?product → [AnalysisSummary]                       [all]
GET  /history/compare         ?analysis_id&against_id|product → HistoricalDiff   [all]
POST /feedback                {recommendation_id, decision, reason} → Feedback   [all]
GET  /feedback                → paginated [Feedback]                             [ADMIN]
GET  /evaluation              ?case_id → [EvaluationResult] (per method)         [ADMIN, REVIEWER]
POST /evaluation/run          {method|all} → 202 (async)                         [ADMIN]
```
`/evaluation` returns only metrics computed against `evaluation_cases`; there is
no endpoint that accepts a hand-entered metric.

## /admin  [ADMIN only]
```
POST   /admin/standards            {…} → Standard
PATCH  /admin/standards/:id        {…} → Standard
POST   /admin/standards/import     multipart CSV → {inserted,updated,rejected[]}
POST   /admin/standards/:id/validate → {ok, issues[]}
POST   /admin/relationships        {from,to,type,evidence,source} → StandardRelationship
POST   /admin/qco                  {…} → QcoRecord
POST   /admin/certification        {…} → CertificationRecord
GET    /admin/ingestion            → embedding/graph-sync status
GET    /admin/health               → {db,neo4j,object_store,ai_provider,embedding_provider}
GET    /admin/evaluation           → latest EvaluationResults
```
Only `ADMIN` may mutate authoritative standard/QCO/certification records
(`security.md`). Officers can *add* a standard to a recommendation via review, but
that creates a `review_decision`, not an authoritative standard edit.

## Shared type generation

`schemas/` Pydantic models → `/openapi.json` → `openapi-typescript` →
`frontend/src/types/api.ts`. CI fails if generated types are stale, guaranteeing
frontend/backend contract parity.
