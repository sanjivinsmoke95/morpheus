# MORPHEUS — Security & Data-Use

> Roles, authentication, upload safety, secret handling, audit, and — critically
> for this domain — **lawful data use** around BIS/authoritative content.

## 1. Roles & RBAC

| Role | Can | Cannot |
|---|---|---|
| **ADMIN** | manage authoritative standards/relationships/QCO/certification, CSV import, view health/evaluation, all officer/reviewer actions | — |
| **OFFICER** | upload, run analysis, edit requirements, make review decisions, add a standard *to a recommendation* (as a decision), generate reports | edit authoritative standard records |
| **REVIEWER** | read analyses, make review decisions, comment | upload/mutate standards |

RBAC is enforced **server-side** per route (dependency `require_roles(...)`),
never in the client. A route's `[roles]` in `api-contracts.md` is authoritative.
The officer "add standard" action creates a `review_decision`
(`ADD_STANDARD`) referencing an existing standard, or flags a not-in-DB number for
admin curation — it never writes an authoritative row.

## 2. Authentication

- JWT (short-lived access token) signed with a server secret; passwords hashed
  with bcrypt/argon2. Optional refresh + server-side revocation list for logout.
- No secrets in the frontend or in Git; all via env / mounted secrets. AI and
  embedding provider keys are **backend-only**; the browser never sees them.
- Login is rate-limited; failed attempts audited.

## 3. Upload validation

Before any processing, `POST /documents`:
- allowlist MIME/extension: `application/pdf`, `application/vnd…docx`, `text/plain`;
- enforce a max size (config, e.g. 25 MB) → `413`;
- verify magic bytes match the extension (defend against disguised files);
- store to object storage under a random `storage_key`, compute `checksum_sha256`;
- never execute or render uploaded content; PDFs parsed with PyMuPDF in-process
  with resource limits; OCR runs on rasterized pages only.

## 4. Data-use / copyright (domain-specific, non-negotiable)

- **Do not** scrape or store copyrighted BIS standard PDFs. Store **metadata**,
  **relationships**, **permitted excerpts**, **evidence references**, and
  **authoritative source URLs** per applicable access/use permissions.
- **Do not** bypass CAPTCHA, auth, paywalls, rate limits, robots restrictions, or
  access controls. **Do not** assume undocumented BIS APIs exist.
- Every standard/QCO/certification/relationship row carries `data_origin`
  (`AUTHORITATIVE|CURATED|DEMO_SYNTHETIC`) + `source_url`/`source_name`/
  `retrieved_at`/`verification_status`. Demo/synthetic data is clearly labelled in
  API and UI and can never present as official BIS data or reach `HIGH`
  confidence.
- Regulatory/QCO/certification status is shown **only** from stored authoritative
  records with their source and retrieval date; the system abstains otherwise.

## 5. Prompt-injection & LLM safety

Uploaded document text is untrusted **data**. Extraction prompts instruct the
model to ignore instructions embedded in the document. The explainer/classifier
see only bounded evidence payloads, not the open web or raw documents, so a
malicious tender cannot steer the model into inventing standards or authority
(reinforced by the standard-number validator and evidence guard in
`ai-pipeline.md`/`evidence-model.md`).

## 6. Audit logging

`audit_logs` records actor, action, entity, before/after JSON, ip, timestamp for:
auth events, requirement edits, review decisions, admin standard/QCO edits, report
generation, CSV imports. Review decisions additionally snapshot AI + evidence
(immutable trail). Logs are queryable by admin.

## 7. Transport & storage

- TLS in front of the API; CORS restricted to the known frontend origin.
- Secrets via env/secret manager; `.env` gitignored; `.env.example` documents keys
  with empty values.
- DB least-privilege credentials; object storage private (signed URLs for report
  download, scoped + expiring).

## 8. Abuse & resilience

- Per-user rate limits on upload and analysis; per-analysis token/cost budget.
- Graceful degradation: AI/embedding/DB/Neo4j failures return typed errors
  (`UPSTREAM_AI_ERROR`, etc.), mark affected items `REVIEW_REQUIRED`, and never
  fabricate a result to fill the gap.
