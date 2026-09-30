# MORPHEUS

**AI-Powered Procurement Specification Intelligence for the Indian Standards ecosystem**

MORPHEUS helps procurement officers understand, validate, and audit tender specifications against Indian Standards. It takes a procurement document, extracts structured requirements, normalizes technical parameters, discovers relevant standards using hybrid retrieval, evaluates applicability, traces supporting evidence and relationships, identifies gaps/conflicts/version issues, and produces a procurement-ready audit/report for human review.

> **AI understands · Search discovers · The knowledge graph connects · Rules validate · Evidence supports · The officer decides.**

MORPHEUS is designed as an **AI-assisted decision-support system**, not an autonomous legal or procurement authority. The system does not invent standard numbers, clauses, QCO status, certification status, or legal conclusions. When evidence is insufficient, it abstains with `REVIEW_REQUIRED`.

---

## 1. Project Title

### MORPHEUS — AI-Powered Procurement Specification Intelligence

MORPHEUS is a procurement-specification intelligence platform for mapping tender requirements to the Indian Standards ecosystem with traceable evidence, applicability reasoning, regulatory records, and human verification.

---

## 2. SIH Problem Statement ID + Title

**Problem Statement ID:** **26108**

**Title:** **AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications**

MORPHEUS addresses the problem by combining document understanding, requirement extraction, hybrid standards retrieval, applicability classification, a standards knowledge graph, deterministic audit rules, evidence grounding, and human-in-the-loop review.

---

## 3. Problem Being Solved

Procurement specifications can contain many technical requirements covering products, materials, dimensions, performance, testing, safety, installation, certification, and referenced standards.

Manually checking these requirements against the Indian Standards ecosystem can be time-consuming and difficult to audit. A procurement officer may need to:

- read and interpret lengthy tender documents;
- identify individual technical requirements;
- normalize units and parameters;
- find potentially applicable Indian Standards;
- distinguish directly applicable standards from related/testing/material/safety standards;
- check versions, superseded standards, and amendments;
- identify missing or conflicting requirements;
- verify regulatory/QCO/certification information;
- trace every important finding back to evidence; and
- prepare a reviewable procurement report.

MORPHEUS brings these steps into one traceable workflow while keeping the final decision with the procurement officer.

---

## 4. Proposed Solution

MORPHEUS follows a layered pipeline:

```text
Tender PDF / DOCX / TXT / scanned PDF
                │
                ▼
        Document Processing
        PDF / DOCX / OCR
                │
                ▼
     Requirement Extraction
                │
                ▼
     Product + Parameter Profile
     Unit / value normalization
                │
                ▼
       Hybrid Standard Search
      BM25 + Vector + Metadata
                │
                ▼
      Candidate Ranking
                │
                ▼
    Applicability Classification
       + deterministic gates
                │
                ▼
       Evidence Assembly
                │
        ┌───────┴────────┐
        ▼                ▼
 Knowledge Graph     Audit Engines
 versions/amendments coverage/conflicts
 relationships       gaps/readiness
        │                │
        └───────┬────────┘
                ▼
       Human Review / Sign-off
                │
                ▼
       PDF / DOCX / JSON Report
```

The system is deliberately evidence-first. AI can propose an interpretation or applicability class, but deterministic rules and evidence constraints prevent unsupported claims from becoming authoritative recommendations.

### Core design principles

- **No fabricated authority:** a recommended standard must exist in the standards catalogue.
- **Evidence-first:** important findings reference first-class evidence records.
- **Human-in-the-loop:** officers accept, reject, edit, or mark findings for review.
- **Transparent retrieval:** lexical, semantic, metadata, and graph signals are retained.
- **Abstention:** insufficient evidence produces `REVIEW_REQUIRED`.
- **Provenance:** records are labelled `DEMO_SYNTHETIC`, `PUBLIC_METADATA`, `VERIFIED_RECORD`, or `REVIEW_REQUIRED`.
- **Regulatory caution:** QCO/certification information is shown from stored records; GFR output is advisory and never presented as a legal verdict.

---

## 5. Key Features

### Document understanding

- PDF ingestion using PyMuPDF.
- DOCX ingestion using python-docx.
- TXT ingestion.
- Scanned-PDF detection and Tesseract OCR.
- Page-level source references and extraction provenance.

### Requirement intelligence

- Structured requirement extraction.
- Requirement types such as product, parameter, dimension, material, performance, safety, testing, certification, installation, and referenced standard.
- Parameter/value/comparator extraction.
- Unit normalization using a deterministic unit library.
- Product/domain profile including category, parameters, sector, installation context, and related attributes.

### Indian Standards discovery

- Keyword/BM25 retrieval.
- Vector/semantic retrieval using pgvector.
- Metadata-aware retrieval.
- Hybrid fusion of lexical, semantic, product, material, scope, sector, parameter, and graph signals.
- Optional reranking.
- Relevance bands: HIGH / MEDIUM / LOW rather than probability claims.
- Alternative recommendations when multiple standards remain plausible.

### Applicability intelligence

Recommendations can be classified into relationships such as:

- DIRECTLY_APPLICABLE
- NORMATIVE_REFERENCE
- TESTING
- SAFETY
- MATERIAL
- INSTALLATION
- CERTIFICATION
- CONDITIONAL
- RELATED
- NOT_APPLICABLE

Applicability is proposed by the AI layer where available and constrained by deterministic evidence/rule gates.

### Evidence and explainability

- First-class evidence records.
- Source, page/section, retrieval time, checksum, and provenance.
- `Why this standard?` explanations based on stored signals.
- `Why not this standard?` explanations for exclusions.
- Evidence-linked recommendation rationale.
- Concise AI decision trace showing the processing stages.
- Evidence snapshots for human review decisions.

### Audit and compliance analysis

- Requirement-to-standard coverage matrix.
- Potential gaps.
- Unit-normalized conflicts.
- Version and supersession checks.
- Amendment-impact review where data exists.
- QCO and certification records.
- GFR 2017 advisory review flags.
- Procurement readiness information.

### Human review

- Officer accept/reject/review decisions.
- Requirement editing with downstream re-analysis.
- Reviewer assignment and sign-off workflow.
- Analysis comments.
- Decision/audit trail.

### Reports and export

- PDF compliance/audit reports.
- DOCX reporting.
- Structured procurement JSON export.
- GeM/CPPP **integration-ready** export structure.
- The current export is not a live GeM/CPPP integration.

### Advanced capabilities

- Multilingual language detection and normalization path for Hindi, Bengali, Tamil, Telugu, Kannada, and Marathi.
- Historical comparison.
- Specification Copilot for draft-only requirement/specification suggestions.
- Feedback capture.
- Evaluation harness comparing keyword, vector, hybrid, and final MORPHEUS retrieval.

### Administration

- Standards CRUD.
- CSV import and validation.
- Relationship curation.
- QCO/certification curation.
- Provenance and verification metadata.

---

## 6. Technology Stack

### Frontend

- **React 18**
- **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **TanStack Query**
- **React Router**
- **React Flow**
- Axios

The UI uses a warm cream/white interface with deep government green, saffron, blue, and violet accents. Manrope is used for interface text, IBM Plex Mono for technical identifiers, and Source Serif 4 for evidence/document reading areas.

### Backend

- **Python 3.11**
- **FastAPI**
- **Pydantic**
- **SQLAlchemy 2**
- **Alembic**
- JWT authentication
- bcrypt

### Data

- **PostgreSQL**
- **pgvector**
- SQLite for local development/tests
- **Neo4j** for the optional standards-graph projection
- Local object storage abstraction for uploaded documents/reports

PostgreSQL is the system of record. Neo4j is a projection used for graph traversal/visualization and does not hold unique authoritative data.

### Document processing

- PyMuPDF
- python-docx
- Tesseract OCR
- Pillow
- Pint for unit normalization

### AI

Provider abstraction supports:

- Gemini
- OpenAI-compatible providers
- deterministic offline stub

Embeddings are also provider-abstracted. The default development configuration is keyless and deterministic.

### Reporting / infrastructure

- ReportLab
- python-docx
- Docker Compose
- GitHub Actions CI

---

## 7. System Architecture

```text
                         ┌──────────────────────────────┐
                         │        React + TypeScript    │
                         │   Vite / Tailwind / Query    │
                         └──────────────┬───────────────┘
                                        │ HTTPS / JSON
                                        ▼
                         ┌──────────────────────────────┐
                         │          FastAPI API         │
                         │ Auth / RBAC / OpenAPI        │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │     Analysis Orchestrator    │
                         │ queued → extracting → ...    │
                         └──────────────┬───────────────┘
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
   Ingestion       Extraction     Normalization     Retrieval       Evidence
 PDF/DOCX/OCR        LLM/rules      units/params   BM25/vector      grounding
        │               │               │               │               │
        └───────────────┴───────────────┴───────────────┴───────────────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
          Applicability            Audit engines          Knowledge graph
          + rule gates        versions/gaps/conflicts       Neo4j
                 │                      │                      │
                 └──────────────────────┼──────────────────────┘
                                        ▼
                              Human review / sign-off
                                        │
                                        ▼
                              PDF / DOCX / JSON
```

### Persistence model

**PostgreSQL** stores analyses, requirements, standards, recommendations, evidence, graph relationships, regulatory records, reviews, reports, evaluation results, and workflow state.

**pgvector** stores semantic vectors used by the vector retrieval path.

**Neo4j** optionally projects standards and relationships for graph traversal and visualization.

**Object storage** stores uploaded documents and generated artifacts through an abstraction that can use local storage in development and S3-compatible storage in deployment.

---

## 8. Workflow

### End-to-end officer workflow

```text
1. Officer logs in
        ↓
2. Uploads tender specification
        ↓
3. MORPHEUS extracts document text
        ↓
4. OCR is applied when a page is scanned
        ↓
5. Requirements are extracted
        ↓
6. Officer can edit/verify requirements
        ↓
7. Technical parameters are normalized
        ↓
8. Product/domain profile is derived
        ↓
9. Standards are retrieved using hybrid search
        ↓
10. Candidates are ranked
        ↓
11. Applicability is classified
        ↓
12. Evidence is assembled
        ↓
13. Knowledge graph relationships are traced
        ↓
14. Versions/amendments are checked
        ↓
15. Coverage, gaps and conflicts are calculated
        ↓
16. QCO/certification/GFR review information is surfaced
        ↓
17. Officer reviews recommendations and evidence
        ↓
18. Officer accepts/rejects/marks findings
        ↓
19. Readiness is reviewed
        ↓
20. PDF/DOCX/JSON report is generated
```

### Human-in-the-loop rule

MORPHEUS does not replace the procurement officer. AI outputs are reviewable recommendations supported by evidence. A recommendation without sufficient evidence is downgraded or abstained rather than presented as authoritative.

---

## 9. Installation / Setup Instructions

### Prerequisites

- Python **3.11**
- Node.js / npm
- Docker Desktop (optional, for the full stack)
- Tesseract OCR if running OCR locally outside the provided Docker setup

### Option A — Keyless local development

No PostgreSQL, Neo4j, or AI API key is required.

#### Backend

```bash
cd backend

python3.11 -m venv .venv
./.venv/bin/pip install -r requirements.txt

DATABASE_URL="sqlite:///./dev.db" ENVIRONMENT=development \
  ./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Backend:

- API: http://localhost:8010
- OpenAPI: http://localhost:8010/docs

Development startup creates the local database and seeds demo users, standards, evaluation data, and showcase/scenario data.

#### Frontend

Open another terminal:

```bash
cd frontend
npm install

echo "VITE_API_URL=http://localhost:8010" > .env

npm run dev
```

Frontend:

http://localhost:5174

### Option B — Docker Compose

Run the full local stack:

```bash
docker compose up --build
```

This starts:

- PostgreSQL + pgvector
- Neo4j
- FastAPI backend
- React/Vite frontend

### Makefile shortcuts

```bash
make be-install
make be-dev
make be-test
make migrate
make fe-install
make fe-dev
make up
make down
```

---

## 10. Environment Variables

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

The important variables are:

| Variable | Purpose | Default / Example |
|---|---|---|
| `ENVIRONMENT` | Runtime mode | `development` |
| `DATABASE_URL` | Database connection | `sqlite:///./dev.db` locally |
| `SECRET_KEY` | JWT signing secret | Change for deployment |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5174` |
| `NEO4J_URI` | Optional graph connection | empty locally |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | configured in Docker |
| `LLM_PROVIDER` | LLM provider | `stub` |
| `EMBEDDING_PROVIDER` | Embedding provider | `stub` |
| `LLM_API_KEY` | Provider API key | empty for keyless mode |
| `LLM_BASE_URL` | OpenAI-compatible endpoint | optional |
| `LLM_MODEL` | LLM model | optional |
| `EMBEDDING_API_KEY` | Embedding provider key | optional |
| `EMBEDDING_BASE_URL` | Embedding endpoint | optional |
| `EMBEDDING_MODEL` | Embedding model | optional |
| `OBJECT_STORE_DIR` | Local uploaded-file storage | `./storage` |
| `MAX_UPLOAD_MB` | Upload limit | `25` |

### AI provider configuration

Keyless mode:

```env
LLM_PROVIDER=stub
EMBEDDING_PROVIDER=stub
```

Real provider example:

```env
LLM_PROVIDER=gemini
LLM_API_KEY=<your-key>
```

or:

```env
LLM_PROVIDER=openai_compatible
LLM_API_KEY=<your-key>
LLM_BASE_URL=<provider-endpoint>
LLM_MODEL=<model-name>
```

Do not commit real API keys or production secrets.

---

## 11. How to Run

### Local

Start the backend:

```bash
cd backend
DATABASE_URL="sqlite:///./dev.db" ENVIRONMENT=development \
  ./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Then open:

**http://localhost:5174**

### Demo accounts

Development seed accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@morpheus.example.com` | `morpheus-admin` |
| Officer | `officer@morpheus.example.com` | `morpheus-officer` |
| Reviewer | `reviewer@morpheus.example.com` | `morpheus-reviewer` |

These credentials are for local/demo use only.

### Recommended demo flow

1. Log in as the Officer.
2. Open **New Analysis**.
3. Upload a procurement specification.
4. Let the pipeline process the document.
5. Review/edit the Requirement Matrix.
6. Open Recommendations.
7. Inspect evidence, applicability, signals, and why-not explanations.
8. Explore the Knowledge Graph.
9. Review gaps, conflicts, versions, QCO/certification, and readiness.
10. Open the Review workflow.
11. Generate the PDF/DOCX report.
12. Reopen the analysis from History.

---

## 12. Current Implementation Status

### Implemented

- Authentication and role-based access for Admin, Officer, and Reviewer.
- PDF, DOCX, TXT, and scanned-PDF OCR ingestion.
- Structured requirement extraction pipeline.
- Requirement editing with downstream partial re-analysis.
- Unit/value normalization.
- Product/domain classification profile.
- BM25 + vector + metadata hybrid retrieval.
- Candidate ranking and transparent retrieval signals.
- Applicability classes with deterministic evidence/rule gates.
- Evidence-first recommendation model.
- Why/why-not recommendation explanations.
- Standards versions and amendments.
- Knowledge graph relationships and optional Neo4j projection.
- Coverage matrix.
- Gap and conflict analysis.
- Procurement readiness analysis.
- QCO and certification record handling with provenance.
- GFR 2017 advisory review flags.
- Multilingual language detection/normalization path.
- Historical comparison.
- Draft-only specification copilot.
- Officer review, decisions, comments, and sign-off workflow.
- PDF/DOCX reporting.
- Structured GeM/CPPP integration-ready JSON export.
- Evaluation harness for retrieval/applicability/evidence-related metrics.
- Standards administration and CSV curation.
- AI provider abstraction for Gemini/OpenAI-compatible providers.
- Deterministic offline stub mode.
- Security headers and production boot safety gates.
- Automated backend/frontend CI.

### Current default mode

The application is fully runnable **keyless** using deterministic engines and the offline stub provider.

Real LLM/embedding providers are optional and configured through environment variables.

### Tests / validation

The repository currently contains the deterministic backend test suite and frontend type/build checks used by CI.

Run:

```bash
cd backend
ENVIRONMENT=test ./.venv/bin/python -m pytest -q

cd ../frontend
npm run typecheck
npm run build
```

The GitHub Actions workflow also runs backend migrations/tests and frontend typecheck/build on pushes to `main` and pull requests.

### Important prototype limitation

The included standards/QCO/certification demo records are labelled **DEMO_SYNTHETIC** where applicable. They are not presented as authoritative BIS data. The system is designed to accept curated/verified metadata without embedding copyrighted standard PDFs.

---

## 13. Demo Link

### Repository

https://github.com/sanjivinsmoke95/morpheus

### Local demo

Frontend:

http://localhost:5174

Backend/OpenAPI:

http://localhost:8010/docs

### Live deployment

A public deployed demo URL is **not currently specified in the repository**. Do not treat the local URLs above as public deployment links.

---

## 14. Team Members

### Team: MORPHEUS

Team-member names are not currently recorded in the repository source.

Add the official SIH team member list here before the final submission:

- **Team Lead:** [Name]
- **Member 2:** [Name]
- **Member 3:** [Name]
- **Member 4:** [Name]
- **Member 5:** [Name]
- **Member 6:** [Name]

Do not infer or fabricate team membership from GitHub contributors.

---

## Project Structure

```text
morpheus/
├── backend/
│   ├── app/
│   │   ├── api/routers/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── audit/
│   │   │   ├── classification/
│   │   │   ├── evidence/
│   │   │   ├── extraction/
│   │   │   ├── graph/
│   │   │   ├── ingestion/
│   │   │   ├── normalization/
│   │   │   ├── orchestrator/
│   │   │   ├── reports/
│   │   │   └── retrieval/
│   │   └── evaluation/
│   ├── alembic/
│   ├── scripts/
│   └── tests/
├── frontend/
│   ├── public/
│   │   ├── assets/
│   │   └── brand/
│   └── src/
│       ├── components/
│       ├── lib/
│       ├── pages/
│       └── types/
├── docs/
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## Data Provenance and Responsible AI

MORPHEUS separates **system intelligence** from **authority**.

The AI layer can:

- extract;
- normalize;
- classify;
- explain;
- summarize;
- draft.

It cannot independently establish:

- an official standard that does not exist in the catalogue;
- a legal conclusion;
- a QCO status;
- certification status;
- authoritative regulatory applicability.

Important records carry provenance such as:

```text
DEMO_SYNTHETIC
PUBLIC_METADATA
VERIFIED_RECORD
REVIEW_REQUIRED
```

When evidence is missing or contradictory, MORPHEUS surfaces the issue for officer review rather than manufacturing certainty.

---

## Security

The backend includes:

- JWT-based authentication;
- role-aware authorization;
- production secret checks;
- production prohibition of development authentication mode;
- security response headers;
- CORS configuration;
- backend-only secrets;
- audit/decision records;
- evidence snapshots for review decisions.

Development convenience settings and seeded credentials must be replaced before a real deployment.

---

## Evaluation & Benchmark Harness

MORPHEUS includes a comprehensive, labelled evaluation harness over 36 `DEMO_SYNTHETIC` procurement cases comparing four distinct algorithmic pipelines:

1. **Keyword (BM25 only)**: Lexical term frequency and inverted index scoring against standard titles, scopes, and keywords.
2. **Vector (Cosine embeddings only)**: Semantic similarity computed against indexed clause chunks.
3. **Hybrid Retrieval**: Linear weighted fusion of BM25 lexical overlap and semantic chunk proximity.
4. **MORPHEUS Pipeline**: Full intelligence architecture combining hybrid retrieval, tender-level product profile fusion, cross-domain conflict demotion, multi-factor applicability reasoning, knowledge graph relationships, standard edition/version checks, and strict 5-level evidence gating.

The evaluation harness computes dynamic, non-hardcoded metrics:

- **Ranking & Retrieval**: Precision@5, Recall@5, MRR, nDCG@5.
- **Applicability & Grounding**: Applicability Precision, Recall, Macro F1, Evidence Support Precision, Confusion Matrix.
- **Safety & Verification**: Hallucination Rate (0.0%), Unsupported Recommendation Rate (0.0%), Citation Correctness (100.0%), Adversarial Case Abstention Rate (100.0%).

To run the offline evaluation benchmark:
```bash
cd backend
python scripts/run_evaluation.py
```

### Evidence Quality Model
Evidence strength is strictly assessed across 5 discrete levels rather than a binary flag:
- `STRONG`: Verified standard evidence chunk with direct parameter, product, or statutory QCO match.
- `SUPPORTED`: Valid scope overlap or verified graph relationship without domain conflict.
- `WEAK`: Lexical similarity without confirmed product or scope compatibility (strictly demoted from `DIRECTLY_APPLICABLE`).
- `NO_EVIDENCE`: No matching chunk or tender grounding.
- `REVIEW_REQUIRED`: Unknown standard number, conflicting claims, or superseded edition.

### AI Provider Transparency
- **`SEMANTIC_AVAILABLE`**: Real external embedding provider (OpenAI-compatible or Gemini) configured and reachable.
- **`DEGRADED/OFFLINE`**: Safe, hermetic deterministic hashing fallback. The system never claims hashed vectors are semantic AI.

---

## Honest Limitations

- Demo standards, QCO, and certification records are synthetic (`DEMO_SYNTHETIC`) unless explicitly marked otherwise.
- The system is not a live BIS catalogue integration.
- The system is not a live GeM or CPPP integration.
- The system does not scrape or reproduce copyrighted BIS standard PDFs.
- Non-English extraction quality depends on the configured AI path; language detection/normalization is supported independently.
- AI recommendations remain subject to officer verification.
- GFR output is advisory review information, not legal advice or a legal verdict.
- A local/demo deployment should not be treated as production-ready without replacing development secrets/auth settings and configuring production infrastructure.

---

## Documentation

Detailed design and implementation documentation is available under [`docs/`](docs/), including:

- architecture
- AI pipeline
- database schema
- API contracts
- AI providers
- multilingual processing
- procurement export
- knowledge graph
- search/ranking
- evidence model
- security
- testing strategy
- implementation plan

---

## License / Usage

No explicit open-source license is currently declared in the repository. Treat the repository as source-available for the project/demo unless a project-specific license is added.
