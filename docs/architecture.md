# MORPHEUS — Architecture

> **Phase 0 document.** This describes the intended system. No implementation is
> committed yet. Sections marked _(external data)_ depend on authoritative data
> that must be supplied by an administrator or a permitted source — the system is
> designed around them but must not fabricate them.

## 1. What MORPHEUS is

MORPHEUS **audits a procurement specification against the Indian Standards
ecosystem.** It is not a chatbot and not merely a standards search box. The
product traces each tender requirement through applicable standards, their
normative/testing/safety/material/certification relationships, versions and
amendments, and reports coverage, gaps, conflicts, and evidence for an officer
to verify and sign off.

### Operating principle (enforced by architecture, not convention)

| Layer | Role | Guarantee |
|---|---|---|
| **AI** | understands (extract, normalize, classify, explain, draft) | never invents a standard number, clause, QCO, or legal status |
| **Search** | discovers candidates | transparent lexical + vector + metadata signals |
| **Knowledge graph** | connects standards | every edge carries a source + evidence + confidence |
| **Rules** | validate (versions, conflicts, coverage) | deterministic, unit-tested |
| **Evidence** | supports every finding | first-class entity; findings reference `evidence_id`s |
| **Officer** | decides | human-in-the-loop; decisions persisted with audit trail |

Two hard constraints thread through every component:
1. **No fabricated authority.** A recommended standard must exist in the
   `standards` table. Regulatory/certification status comes only from stored
   authoritative records. When evidence is insufficient, the system **abstains**
   (`REVIEW_REQUIRED`).
2. **No fabricated accuracy.** "Confidence" is a labelled function of defined
   signals (system relevance/confidence), never legal certainty, and evaluation
   metrics come only from a labelled dataset.

## 2. Canonical vocabulary (single source of truth)

These enums are referenced by every other doc. They live in code as Python
`Enum`s and TypeScript string-literal unions generated into a shared contract.

```
ApplicabilityClass = DIRECTLY_APPLICABLE | NORMATIVE_REFERENCE | TESTING |
                     SAFETY | MATERIAL | INSTALLATION | CERTIFICATION |
                     CONDITIONAL | RELATED | NOT_APPLICABLE
CoverageClass      = FULL | PARTIAL | MISSING | UNKNOWN | NOT_APPLICABLE
Confidence         = HIGH | MEDIUM | LOW | REVIEW_REQUIRED   # REVIEW_REQUIRED == abstain
Relevance          = HIGH | MEDIUM | LOW
RelationshipType   = REFERENCES | NORMATIVE_REFERENCE | TESTING | SAFETY |
                     MATERIAL | INSTALLATION | CERTIFICATION | AMENDS |
                     SUPERSEDES | SUPERSEDED_BY | RELATED_TO
RequirementType    = PRODUCT | PARAMETER | DIMENSION | MATERIAL | PERFORMANCE |
                     SAFETY | TESTING | CERTIFICATION | INSTALLATION | REFERENCED_STANDARD
Role               = ADMIN | OFFICER | REVIEWER
ReviewDecision     = ACCEPT | REJECT | MARK_FOR_REVIEW | EDIT | ADD_STANDARD |
                     ADD_COMMENT | OVERRIDE
VerificationStatus = UNVERIFIED | VERIFIED | DISPUTED        # for authoritative records
QcoStatus          = MANDATORY | CONDITIONAL | VOLUNTARY | UNKNOWN
DataOrigin         = AUTHORITATIVE | CURATED | DEMO_SYNTHETIC # provenance of any record
AnalysisStatus     = QUEUED | EXTRACTING | OCR | EXTRACTING_REQUIREMENTS |
                     RETRIEVING | RANKING | CLASSIFYING | AUDITING | READY | FAILED
```

`DataOrigin` is stamped on every standard, relationship, QCO and certification
record so demo/synthetic data is never presented as official BIS data.

## 3. Logical architecture

```
                         ┌──────────────────────────────────────────┐
  React SPA  ──HTTPS──►  │  FastAPI API gateway (auth, RBAC, OpenAPI) │
  (typed client)         └───────────────┬───────────────────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │     Analysis Orchestrator     │  (async job runner)
                          │  state machine over stages ↓  │
                          └──────────────┬───────────────┘
   ┌──────────┬───────────┬─────────────┼──────────────┬───────────────┬──────────┐
   ▼          ▼           ▼             ▼              ▼               ▼          ▼
Document   Requirement  Requirement   Hybrid        Candidate     Applicability  Evidence
Processing Extraction   Normalization Retrieval      Ranking       Classifier    Retrieval
(PyMuPDF,  (LLM→JSON)   (units, rules)(BM25+vector+ (fusion +     (LLM+rules→    (grounds
 docx,                                 metadata)     rerank)       class)          findings)
 Tesseract)                                                                        │
   └──────────┴───────────┴─────────────┴──────────────┴───────────────┴──────────┘
                                         │
        ┌────────────────┬──────────────┼───────────────┬───────────────────┐
        ▼                ▼              ▼               ▼                   ▼
  Standards Graph   Version/Amend.   Gap/Conflict   Human Review       Report
  (Neo4j, read)     Engine (rules)   Engine (rules) (decisions,        Generator
                                                     audit)            (PDF/DOCX)

  Persistence:  PostgreSQL + pgvector  │  Neo4j (graph)  │  Object storage (files)
```

Every stage **reads and writes to Postgres** (the system of record). Neo4j is a
**projection** of standards + relationships for graph traversal and visualization;
it is rebuilt from Postgres and never holds unique authoritative data.

## 4. Component responsibilities

| Component | Input | Output | Determinism |
|---|---|---|---|
| Document Processing | uploaded file | `document_pages` (text + layout + `is_scanned`), OCR when text density low | deterministic |
| Requirement Extraction | page text | `requirements` (typed) via LLM → strict JSON schema | LLM, schema-validated |
| Requirement Normalization | raw requirement | value + unit + canonical form (`requirement_attributes`) | rules + unit library |
| Hybrid Retrieval | normalized requirement | ranked `candidate_standard`s with per-signal scores | deterministic given embeddings |
| Candidate Ranking | candidates + signals | fused score → `Relevance` band + optional cross-encoder rerank | deterministic |
| Applicability Classifier | requirement + candidate + evidence | `ApplicabilityClass` + rationale | LLM proposes, rules gate |
| Evidence Retrieval | any finding | `evidence` rows (source, page/section, passage, checksum) | deterministic |
| Version/Amendment Engine | referenced standards | discrepancies, amendment impact (where data exists) | rules; abstains without data |
| Gap/Conflict Engine | requirements + coverage | `gaps`, `conflicts`, `coverage_results` | rules + unit normalization |
| Human Review | AI outputs | `review_decisions` + evidence snapshot | human |
| Report Generator | persisted analysis | PDF + DOCX | deterministic |

## 5. Analysis Orchestrator (state machine)

The orchestrator runs one `analysis` through `AnalysisStatus`. Each transition is
idempotent, persisted, and resumable; a failure records the failing stage and
marks affected items `REVIEW_REQUIRED` rather than failing the whole run.

```
QUEUED → EXTRACTING → (OCR?) → EXTRACTING_REQUIREMENTS → RETRIEVING → RANKING
       → CLASSIFYING → AUDITING(version, amendment, coverage, gap, conflict) → READY
```

Editing a requirement (officer action) re-enters at `RETRIEVING` for **only the
affected requirement and its downstream findings** (partial re-analysis), so edits
demonstrably change results without recomputing everything.

## 6. Frontend route / component map

| Route | Screen | Key components | Primary API |
|---|---|---|---|
| `/login` | Login | AuthForm | `POST /auth/login` |
| `/` | Dashboard | KpiCards, RecentAnalyses | `GET /analyses`, `GET /dashboard` |
| `/analyses/new` | New Analysis | Uploader (drag/drop), ManualText | `POST /documents`, `POST /analyses` |
| `/analyses/:id/processing` | Processing | StageProgress (SSE/poll) | `GET /analyses/:id` |
| `/analyses/:id/requirements` | Requirement Matrix | EditableTable, Filters, SourceRef | `GET/PATCH /requirements` |
| `/analyses/:id/recommendations` | Recommendations | RecoList, ClassificationBadge, EvidencePanel, WhyNot, Alternatives | `GET /recommendations` |
| `/standards/:isNumber` | Standard Details | Metadata, Versions, Amendments, Relationships, Evidence | `GET /standards/:id` |
| `/analyses/:id/graph` | Knowledge Graph | ReactFlow canvas, NodeDrawer, EdgeDrawer | `GET /graph` |
| `/analyses/:id/coverage` | Coverage / Gaps | CoverageMatrix, GapList | `GET /coverage`, `GET /gaps` |
| `/analyses/:id/conflicts` | Conflicts | ConflictList | `GET /conflicts` |
| `/analyses/:id/versions` | Version / Amendment | VersionTable, AmendmentImpact | `GET /versions`, `GET /amendments` |
| `/analyses/:id/certification` | Certification / QCO | QcoTable, SourceRef | `GET /certification`, `GET /qco` |
| `/analyses/:id/readiness` | Readiness Dashboard | ReadinessScorecard | `GET /analyses/:id/readiness` |
| `/analyses/:id/review` | Human Review | ReviewQueue, DecisionForm | `GET/POST /reviews` |
| `/analyses/:id/history-compare` | Historical Comparison | DiffView | `GET /history/compare` |
| `/analyses/:id/reports` | Reports | ReportBuilder, DownloadButtons | `POST /reports`, `GET /reports/:id` |
| `/history` | Analysis History | HistoryTable | `GET /analyses` |
| `/feedback` | Feedback | FeedbackList | `GET /feedback` |
| `/evaluation` | Evaluation Dashboard | MetricsCharts (Recharts), BaselineCompare | `GET /evaluation` |
| `/admin` | Admin | StandardsEditor, CsvImport, QcoManager, Health | `/admin/*` |

Every screen implements loading / error / empty / retry states (see
`testing-strategy.md` §UI states). The typed client (Axios + TanStack Query) is
generated from the backend OpenAPI schema so types cannot drift.

## 7. Repository / folder structure

```
morpheus/
├── docs/                      # Phase 0 (this)
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/              # config, security, logging, settings
│   │   ├── db/                # SQLAlchemy base, session, pgvector setup
│   │   ├── models/            # ORM: one module per entity group
│   │   ├── schemas/           # Pydantic contracts (exported to OpenAPI)
│   │   ├── api/routers/       # one router per /resource
│   │   ├── services/
│   │   │   ├── ingestion/     # pdf, docx, ocr, page model
│   │   │   ├── extraction/    # requirement extraction (LLM)
│   │   │   ├── normalization/ # units, canonicalization
│   │   │   ├── retrieval/     # bm25, vector, hybrid, rerank
│   │   │   ├── classification/# applicability
│   │   │   ├── evidence/      # evidence assembly + checksum
│   │   │   ├── graph/         # neo4j projection + queries
│   │   │   ├── audit/         # version, amendment, gap, conflict, coverage
│   │   │   ├── reports/       # reportlab + docx
│   │   │   ├── ai/            # LLM + embedding provider abstraction
│   │   │   └── orchestrator/  # analysis state machine
│   │   └── evaluation/        # metrics harness
│   ├── alembic/               # migrations
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/{pages,components,lib,types}/
│   └── package.json
├── data/
│   ├── demo/                  # DEMO_SYNTHETIC seed (clearly labelled)
│   └── evaluation/            # labelled gold cases
├── neo4j/                     # graph constraints/seed cypher
├── docker-compose.yml         # postgres+pgvector, neo4j, backend, frontend
└── Makefile
```

## 8. Deployment topology

`docker-compose` services: `db` (postgres16 + pgvector), `neo4j`, `backend`
(uvicorn), `frontend` (vite build served static / dev server), `worker`
(orchestrator; may be the backend process in dev, a separate container in prod).
Object storage is an abstraction (`LocalObjectStore` in dev, S3-compatible in
prod). No secrets in images or Git; all via env / mounted secrets.

## 9. Feature dependency graph (build order rationale)

```
Auth+DB+Docker ─► Ingestion ─► Requirement Extraction ─► Normalization ─┐
Standards data + embeddings ─► Hybrid Retrieval ─► Ranking ─────────────┤
                                                                        ▼
                                        Applicability + Evidence ─► Recommendations
                                                                        │
                             ┌──────────────────────────────────────────┤
                             ▼                    ▼                       ▼
                        Graph (Neo4j)      Version/Amendment        Coverage/Gap/Conflict
                             │                    │                       │
                             └──────────► Readiness Dashboard ◄───────────┘
                                                  │
                                              Human Review ─► Report ─► History
                                                  │
                        QCO/Certification ─► (feeds Readiness + Report)
                        Evaluation harness (parallel, needs gold set)
```

The **vertical slice** (Phase 2) is the shortest path from _upload_ to _report_
that touches every architectural seam; everything else deepens a seam that the
slice already proved. See `implementation-plan.md`.
