# MORPHEUS — Database Schema (PostgreSQL + pgvector)

> System of record. Neo4j is a rebuildable projection (see `knowledge-graph.md`).
> Every entity has `id uuid pk default gen_random_uuid()`, `created_at`,
> `updated_at`. Authoritative-capable entities also carry `data_origin`
> (`AUTHORITATIVE|CURATED|DEMO_SYNTHETIC`), `source_url`, `source_name`,
> `retrieved_at`, `verification_status`. Enums are the canonical ones from
> `architecture.md §2`.

## ER overview

```
users ─< reviews ; users ─< review_decisions ; users ─< audit_logs
documents ─< document_pages
documents ─1─ analyses ─< requirements ─< requirement_attributes
requirements ─< recommendations >─ standards
recommendations ─< recommendation_evidence >─ evidence
standards ─< standard_versions ; standards ─< standard_amendments
standards ─< standard_relationships >─ standards   (self, typed, evidenced)
standards ─< standard_evidence >─ evidence
analyses ─< coverage_results ; analyses ─< gaps ; analyses ─< conflicts
reviews ─< review_decisions ─0..1─ recommendations/gaps/conflicts (target)
analyses ─< reports
standards ─< qco_records ; standards ─< certification_records
analyses ─< feedback
historical_tenders (standalone corpus)
evaluation_cases ─< evaluation_results
```

## Core: identity & documents

```sql
users(id, email UNIQUE, full_name, password_hash, role Role, is_active,
      created_at, updated_at)
roles  -- fixed enum in code; table only if org needs custom perms (deferred)

documents(id, uploaded_by→users, filename, mime_type, byte_size, checksum_sha256,
          storage_key, page_count, is_scanned bool, language_detected,
          data_origin, created_at, updated_at)
document_pages(id, document_id→documents, page_number, text, char_count,
               ocr_used bool, ocr_confidence numeric NULL, layout_json jsonb,
               created_at)   -- UNIQUE(document_id, page_number)
```

## Analyses, requirements

```sql
analyses(id, document_id→documents, created_by→users, title, status AnalysisStatus,
         stage_error text NULL, options_json jsonb, started_at, finished_at,
         created_at, updated_at)

requirements(id, analysis_id→analyses, req_code text,        -- e.g. "R-007"
             requirement_type RequirementType, description text,
             source_page int, source_section text,
             confidence Confidence, extraction_method text,  -- 'llm'|'manual'|'edited'
             is_edited bool default false, superseded_by uuid NULL,
             created_at, updated_at)   -- UNIQUE(analysis_id, req_code)

requirement_attributes(id, requirement_id→requirements, key text,   -- 'voltage'
             raw_value text, normalized_value numeric NULL, unit text NULL,
             canonical_unit text NULL, comparator text NULL, -- '>=','=','range'
             value_high numeric NULL, confidence Confidence, created_at)
```

Editing a requirement writes a new version and sets `is_edited`; the orchestrator
re-runs retrieval for it (partial re-analysis). Old rows are retained for audit.

## Standards (§7 model) & structure

```sql
standards(id, is_number text UNIQUE,        -- e.g. "IS 694 : 2010"
          is_number_normalized text,         -- "IS694" for matching
          title text, scope text, description text, sector text,
          product_categories text[], materials text[], keywords text[],
          status text,                        -- ACTIVE|WITHDRAWN|SUPERSEDED|DRAFT
          publication_year int, revision_year int, current_version text,
          hs_codes text[] NULL,
          data_origin, source_url, source_name, retrieved_at, verification_status,
          created_at, updated_at)

standard_versions(id, standard_id→standards, version_label, effective_date date NULL,
          is_current bool, notes text, data_origin, source_url, source_name,
          retrieved_at, created_at)

standard_amendments(id, standard_id→standards, amendment_no text,
          amendment_date date NULL, affected_clauses text[] NULL, summary text,
          data_origin, source_url, source_name, retrieved_at,
          verification_status, created_at)

standard_relationships(id, from_standard_id→standards, to_standard_id→standards,
          relationship_type RelationshipType, note text,
          relationship_confidence Confidence,   -- not all edges equally authoritative
          data_origin, source_url, source_name, retrieved_at, verification_status,
          created_at)   -- UNIQUE(from,to,relationship_type)

standard_evidence(id, standard_id→standards, evidence_id→evidence, role text,
          created_at)
```

## Retrieval / embeddings (pgvector)

```sql
-- One row per embeddable chunk of a standard (title+scope+metadata, and any
-- permitted excerpt). Dimension fixed per embedding model; recorded in embedding_meta.
standard_chunks(id, standard_id→standards, chunk_type text,  -- 'title_scope'|'metadata'|'excerpt'
          content text, embedding vector(768), token_count int,
          embedding_model text, created_at)
CREATE INDEX ON standard_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON standards USING gin (to_tsvector('english',
          coalesce(title,'')||' '||coalesce(scope,'')||' '||array_to_string(keywords,' ')));

requirement_embeddings(id, requirement_id→requirements, embedding vector(768),
          embedding_model text, created_at)
```

## Recommendations & traceability

```sql
recommendations(id, analysis_id→analyses, requirement_id→requirements,
          standard_id→standards, applicability_class ApplicabilityClass,
          relevance Relevance, relevance_score numeric,    -- internal, not "probability"
          retrieval_method text,        -- 'bm25'|'vector'|'hybrid'
          signals_json jsonb,           -- {scope_match, product_match, parameter_match,...}
          rationale text,               -- LLM explanation grounded in evidence
          confidence Confidence, final_rank int, is_primary bool,
          review_status text default 'PENDING',   -- PENDING|ACCEPTED|REJECTED|REVIEW
          excluded bool default false, exclusion_reason text NULL,  -- 'why not'
          created_at, updated_at)
          -- UNIQUE(requirement_id, standard_id)

recommendation_evidence(id, recommendation_id→recommendations, evidence_id→evidence,
          role text, created_at)   -- role: 'scope'|'parameter'|'relationship'|...
```

`signals_json` persists the transparent match breakdown so "Why not this
standard?" and the ranking explanation are reproducible, not regenerated.

## Evidence (first-class — see `evidence-model.md`)

```sql
evidence(id, source_type text,        -- 'tender_document'|'standard_record'|
                                       -- 'standard_relationship'|'qco_record'|'amendment'
          source_name text, source_url text NULL,
          document_id→documents NULL, page int NULL, section text NULL,
          text text, retrieved_at, checksum_sha256 text,
          relationship_type text NULL, data_origin, created_at)
```

## Audit engine outputs

```sql
coverage_results(id, analysis_id→analyses, requirement_id→requirements,
          standard_id→standards NULL, coverage CoverageClass, explanation text,
          evidence_id→evidence NULL, status text, created_at, updated_at)

gaps(id, analysis_id→analyses, gap_type text,   -- 'missing_testing'|'missing_safety'|...
          description text, related_requirement_id→requirements NULL,
          related_standard_id→standards NULL, severity text,
          is_mandatory_claim bool default false,   -- true ONLY with authoritative evidence
          evidence_id→evidence NULL, status text, created_at)

conflicts(id, analysis_id→analyses, conflict_type text,  -- 'TECHNICAL_PARAMETER'|'VERSION'|...
          parameter text, value_a text, unit_a text, source_a text,
          value_b text, unit_b text, source_b text,
          requirement_a_id→requirements NULL, requirement_b_id→requirements NULL,
          severity text, explanation text, status text, created_at)
```

## Version / amendment findings (analysis-scoped)

```sql
version_findings(id, analysis_id→analyses, referenced_text text, standard_id→standards NULL,
          referenced_version text NULL, current_version text NULL,
          discrepancy_type text,   -- 'OUTDATED'|'SUPERSEDED'|'UNKNOWN'|'OK'
          confidence Confidence, evidence_id→evidence NULL, status text, created_at)

amendment_findings(id, analysis_id→analyses, standard_id→standards,
          amendment_id→standard_amendments, impact_summary text,
          affected_requirement_ids uuid[], confidence Confidence,
          evidence_id→evidence NULL, status text, created_at)
```

## Regulatory (external data)

```sql
qco_records(id, standard_id→standards NULL, product_description text,
          qco_status QcoStatus, order_name text, effective_date date NULL,
          notes text, data_origin, source_url, source_name, retrieved_at,
          verification_status, created_at, updated_at)

certification_records(id, standard_id→standards NULL, scheme text,  -- 'ISI'|'CRS'|...
          product_description text, requirement text, effective_date date NULL,
          data_origin, source_url, source_name, retrieved_at, verification_status,
          created_at)
```

## Human review & audit

```sql
reviews(id, analysis_id→analyses, reviewer_id→users, status text, created_at, updated_at)

review_decisions(id, review_id→reviews, target_type text,  -- 'recommendation'|'gap'|'conflict'|'requirement'
          target_id uuid, decision ReviewDecision, reason text,
          ai_snapshot_json jsonb,        -- the AI output at decision time
          evidence_snapshot_json jsonb,  -- evidence ids + text at decision time
          decided_by→users, created_at)

audit_logs(id, actor_id→users NULL, action text, entity_type text, entity_id uuid,
          before_json jsonb NULL, after_json jsonb NULL, ip inet NULL, created_at)
```

Review decisions persist the AI + evidence **snapshot** so a later change to a
standard record never rewrites the history of what the officer actually decided.

## Reports, feedback, history, evaluation

```sql
reports(id, analysis_id→analyses, format text,  -- 'PDF'|'DOCX'
          storage_key, generated_by→users, params_json jsonb, checksum_sha256,
          created_at)

feedback(id, analysis_id→analyses NULL, recommendation_id→recommendations NULL,
          user_id→users, decision ReviewDecision, reason text, created_at)

historical_tenders(id, title, product_summary text, embedding vector(768) NULL,
          standards_used text[], metadata_json jsonb, data_origin, created_at)

evaluation_cases(id, name, procurement_text text, gold_requirements_json jsonb,
          gold_standards text[], gold_applicability_json jsonb,
          gold_evidence_json jsonb, data_origin default 'DEMO_SYNTHETIC', created_at)

evaluation_results(id, evaluation_case_id→evaluation_cases, run_label text,
          method text,  -- 'keyword'|'vector'|'hybrid'|'morpheus'
          precision_at_k jsonb, recall_at_k jsonb, mrr numeric,
          applicability_f1 numeric, evidence_precision numeric,
          gap_precision numeric, abstention_rate numeric, created_at)
```

## Indexing & integrity notes

- Full-text GIN index on standards; HNSW cosine index on `standard_chunks`.
- FKs `ON DELETE CASCADE` from `analyses` downward; `standards` are never hard
  deleted (status `WITHDRAWN`) to preserve traceability.
- `UNIQUE` guards prevent duplicate recommendations / relationships / pages.
- All timestamps `timestamptz`; `checksum_sha256` on documents, evidence, reports
  for tamper-evidence.
- Portable types + generic `JSONB` so the test suite can run on SQLite where a
  stage does not need pgvector/Neo4j (retrieval/graph tests use their real stores).
