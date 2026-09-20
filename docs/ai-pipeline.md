# MORPHEUS — AI Pipeline

> The LLM **understands**; it never asserts authority. Every LLM call has a
> strict output schema, is validated, and is constrained to a bounded context
> (page text, or retrieved evidence — never the open web). Where the model is
> unsure, the pipeline **abstains** (`REVIEW_REQUIRED`). Providers are abstracted
> so no component is coupled to one vendor.

## 1. Provider abstraction

```python
class LLMProvider(ABC):
    def complete_json(self, prompt, schema, *, temperature=0, max_retries=2) -> dict
    def complete_text(self, prompt, *, temperature) -> str
    @property
    def available(self) -> bool

class EmbeddingProvider(ABC):
    def embed(self, texts: list[str]) -> list[list[float]]
    @property
    def dim(self) -> int
    @property
    def model(self) -> str
```

Implementations: a real provider (configurable, e.g. an OpenAI-compatible or
Gemini endpoint) and a **deterministic offline fallback** used in tests and when
no key is set. `complete_json` enforces the schema (parse → validate → on failure
retry with the validation error appended → on final failure return
`{"_abstain": true}` and the caller marks the item `REVIEW_REQUIRED`). The
pipeline **never** crashes on a bad LLM response.

Embeddings: the model + dimension are recorded per vector row; a model change is
a migration that re-embeds, never a silent mismatch.

## 2. What the LLM may and may not do

| Allowed | Forbidden |
|---|---|
| extract requirements from page text | invent a standard number / clause / QCO |
| normalize a value's unit (proposal) | assert legal/regulatory applicability |
| classify applicability (proposal, rule-gated) | override authoritative records |
| explain a recommendation **from given evidence** | cite a source not in the evidence set |
| draft specification text (labelled DRAFT) | modify the tender |
| summarize for the report | produce a confidence number as "probability" |

The classifier and explainer receive **evidence objects**, not free text, and are
instructed to answer only from them or abstain.

## 3. Stage-by-stage

### 3.1 Document processing (deterministic, no LLM)
PyMuPDF extracts text + layout per page; python-docx for DOCX. A page is flagged
`is_scanned` when char-density < threshold; those pages go to Tesseract OCR,
storing `ocr_confidence`. Output: `document_pages`.

### 3.2 Requirement extraction (LLM → JSON)
Prompt = page text + section context. Output schema:
```json
{ "requirements": [ {
    "requirement_type": "PARAMETER",
    "description": "Minimum operating pressure 10 bar",
    "raw_value": "10", "unit": "bar", "comparator": ">=",
    "source_page": 4, "source_section": "3.2",
    "referenced_standards": ["IS 3589"],
    "confidence": "HIGH" } ] }
```
Validated against Pydantic. `referenced_standards` are strings only — they are
**resolved** against the `standards` table later (unresolved → version finding
`UNKNOWN`), never trusted as existing. Low-confidence extractions are kept but
flagged.

### 3.3 Normalization (rules + unit library, LLM only to disambiguate)
Deterministic unit conversion (a `pint`-style registry) produces
`normalized_value`, `canonical_unit`, `comparator`, `value_high` (for ranges).
The LLM is used only to disambiguate messy phrasing into `{value, unit,
comparator}`; the conversion itself is code, so conflict detection is exact.

### 3.4 Retrieval → ranking (no LLM; see `search-ranking.md`)
Deterministic hybrid retrieval + fusion → candidate standards with per-signal
scores. Optional cross-encoder rerank is a model but scored, not generative.

### 3.5 Applicability classification (LLM proposes, rules gate)
Input: requirement + candidate standard metadata + retrieved evidence. Output:
```json
{ "applicability_class": "TESTING", "rationale": "…cites E-102…",
  "used_evidence_ids": ["E-102"], "confidence": "MEDIUM" }
```
**Rule gate** overrides the LLM in fixed cases: e.g. a candidate reached purely
via a `NORMATIVE_REFERENCE`/`TESTING` graph edge cannot be relabelled
`DIRECTLY_APPLICABLE`; a candidate with no evidence cannot exceed `LOW`; an
`used_evidence_ids` list containing an id not in the provided set forces
`REVIEW_REQUIRED`. The stored class is the gated result.

### 3.6 Evidence assembly (deterministic)
Every recommendation, gap, conflict, version and amendment finding is linked to
`evidence` rows before it is persisted (see `evidence-model.md`). A finding that
cannot be grounded is stored with `confidence=REVIEW_REQUIRED`.

### 3.7 Audit engines (rules, no LLM for the decision)
Version, amendment, coverage, gap and conflict logic is deterministic and
unit-tested. The LLM may only **phrase** the resulting explanation from the
computed facts + evidence.

### 3.8 Explanation & report prose (LLM, grounded)
Given the finding + its evidence, the LLM writes officer-facing prose. It is
constrained to the evidence; the UI shows the evidence beside the prose so a human
can check it.

### 3.9 Specification Copilot (LLM, draft-only — Phase 6)
Generates draft requirements, each labelled `AI-GENERATED DRAFT — REQUIRES
OFFICER REVIEW`, each linked to a supporting standard/evidence. It writes to a
suggestions area, never to the tender or requirement matrix.

## 4. Cross-cutting guardrails

- **Standard-number validator**: any `is_number` the LLM emits is normalized and
  looked up; unresolved numbers are surfaced as "referenced but not in database →
  review", never rendered as a recommendation.
- **Schema-or-abstain**: invalid JSON after retries ⇒ `REVIEW_REQUIRED`, logged
  with the raw output for the eval/debug view.
- **Determinism**: `temperature=0` for extraction/classification; seeds/logging
  so a run is reproducible for audit.
- **Cost/latency**: batched embeddings; per-analysis token budget; the
  orchestrator persists intermediate results so a failure resumes, not restarts.
- **Prompt-injection defense**: tender text is treated as data; extraction prompts
  instruct the model to ignore any instructions inside the document and to extract
  only. The explainer only sees evidence rows, not raw document text.

## 5. Confidence model (labelled, not manufactured)

`Confidence` is derived from defined signals, then labelled as **system
confidence**, never legal certainty:
- extraction: LLM self-report **capped** by parser/section certainty;
- recommendation: function of fused relevance band + evidence count/quality +
  applicability rule outcome;
- audit findings: `HIGH` only with an authoritative/curated evidence row, else
  `MEDIUM`/`LOW`, else `REVIEW_REQUIRED`.

The exact signal→band mapping lives in `search-ranking.md §5` and
`evidence-model.md §4`; it is code, versioned, and shown in the UI as the basis
for the label.
