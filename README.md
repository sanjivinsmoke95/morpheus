# MORPHEUS

**AI-powered Procurement Specification Intelligence for the Indian Standards ecosystem.**

MORPHEUS **audits a procurement specification** against the standards ecosystem: it
understands the spec, extracts structured requirements, maps them to applicable
standards, traces normative/testing/safety/material/certification relationships,
checks versions and amendments, detects gaps and conflicts, grounds every finding
in evidence, lets an officer verify, and generates a procurement-ready report.

> **Core principle.** AI understands · Search discovers · The knowledge graph
> connects · Rules validate · Evidence supports · **The officer decides.**
>
> The LLM never invents a standard number, clause, QCO, or legal status. When
> evidence is insufficient the system **abstains** (`REVIEW_REQUIRED`). Demo data
> is labelled `DEMO_SYNTHETIC` and never presented as official BIS data.

## Status

All phases 0–8 plus admin are implemented and tested. Everything runs **keyless**
(deterministic engines + a stub embedder); a real LLM/embedder plugs in behind the
provider abstraction to upgrade quality.

| Area | Highlights |
|---|---|
| Ingestion | PDF (PyMuPDF), DOCX, TXT, scanned-PDF **OCR** (Tesseract) |
| Extraction | deterministic rule extractor → typed requirements + normalized units (pint) |
| Retrieval | BM25 + vector + metadata **hybrid fusion** → relevance *bands*, not probabilities |
| Applicability | rule-gated classes; evidence caps confidence |
| Evidence | first-class, checksummed; every finding grounded or it abstains |
| Graph | typed relationships, versions, amendments (Postgres source-of-truth; optional Neo4j projection) |
| Audit | conflicts (unit-normalized), coverage matrix, gaps (never "mandatory"), readiness |
| Regulatory | QCO + certification (records-only), amendment impact (review-only) |
| Advanced | HS classify, multilingual detect, historical comparison, spec copilot (draft-only), feedback |
| Evaluation | gold set + harness comparing keyword/vector/hybrid/Morpheus (P@K, R@K, **nDCG@5**, MRR) |
| Product classification | derives product/domain profile (category, parameters, sector, installation) |
| Multilingual | Hindi/Bengali/Tamil/Telugu/Kannada/Marathi → numeral+unit+term normalization → English pipeline |
| Explainability | **why / why-not** per recommendation + an **AI decision trace** (concise pipeline steps) |
| GFR review | GFR 2017 advisory flags (Rules 149/161/173, sustainability) — never a legal verdict |
| Collaboration | analysis comments + reviewer sign-off / return-for-revision |
| Export | structured procurement JSON package (GeM/CPPP integration-ready) + audit PDF |
| AI providers | OpenAI-compatible + Gemini behind the abstraction; offline stub is the keyless default |
| Provenance | DEMO_SYNTHETIC / PUBLIC_METADATA / VERIFIED_RECORD / REVIEW_REQUIRED, never blurred |
| Security | `AUTH_DEV_MODE` (prod enforces password), security headers, prod boot gates |
| Admin | standards CRUD + CSV import + validate + relationship/QCO/cert curation |

## Tech stack

React + TypeScript + Vite + Tailwind + TanStack Query + React Flow · FastAPI +
Pydantic + SQLAlchemy + Alembic · PostgreSQL + pgvector (SQLite for dev/tests) ·
Neo4j (optional) · PyMuPDF / python-docx / Tesseract · provider-abstracted LLM +
embeddings · ReportLab / python-docx · Docker Compose.

## Quick start (local, zero external services)

Runs **keyless** on SQLite — no Postgres, Neo4j, or API keys required.

### Backend → http://localhost:8010
```bash
cd backend
python3.11 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
DATABASE_URL="sqlite:///./dev.db" ENVIRONMENT=development \
  ./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8010
# OpenAPI docs at http://localhost:8010/docs
```
> Port **8010**. On dev startup it creates tables and seeds demo standards, the
> gold set, and users. `python3.11` is required (3.9 won't work).

### Frontend → http://localhost:5174
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8010" > .env
npm run dev
```

### Tests
```bash
cd backend && ./.venv/bin/python -m pytest -q     # 54 tests, offline, deterministic
cd frontend && npx tsc --noEmit                    # type-check
```

### Docker (full stack: Postgres+pgvector, Neo4j, backend, frontend)
```bash
docker compose up --build
```

## Seed logins (dev only — change for production)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@morpheus.example.com` | `morpheus-admin` |
| Officer | `officer@morpheus.example.com` | `morpheus-officer` |
| Reviewer | `reviewer@morpheus.example.com` | `morpheus-reviewer` |

## Demo walkthrough

Log in as the **officer** → **New Analysis** → upload a spec (PDF/DOCX/TXT) →
watch **Processing** → edit a row in the **Requirement Matrix** (re-runs matching)
→ **Recommendations** (evidence, signals, why-not, accept/reject) → **Knowledge
graph** → **Readiness** (conflicts, gaps, outdated refs) → **Review** → generate a
**PDF/DOCX report** → reopen from **History**. Admins get **Admin** + **Evaluation**.

## Configuration (`backend/.env`, copy from `.env.example`)

Everything works with defaults. The **one manual step** to upgrade from the
keyless engines to a real LLM:
```bash
LLM_PROVIDER=gemini            # or openai_compatible
LLM_API_KEY=<your key>
# optional: project the graph into Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_PASSWORD=<password>
```
Change `SECRET_KEY` for any real deployment. Secrets stay backend-only; `.env` is
gitignored.

## Architecture & design docs

See [`docs/`](docs/): `architecture`, `database-schema`, `api-contracts`,
`ai-pipeline`, `ai-providers`, `multilingual`, `procurement-export`, `knowledge-graph`,
`search-ranking`, `evidence-model`, `security`, `testing-strategy`, `implementation-plan`.

## Honest limitations

- Demo standards/QCO/certification are **DEMO_SYNTHETIC**, not authoritative BIS
  data; an admin curates real records (no scraping of copyrighted PDFs).
- Non-English requirement extraction beyond language detection needs the LLM path.
- Complexity/relevance are transparent, labelled system signals — never legal
  certainty. Regulatory status is shown only from stored records or abstained.
