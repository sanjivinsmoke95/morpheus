# MORPHEUS — Evidence Model

> Evidence is a **first-class entity**. Every important finding — recommendation,
> coverage result, gap, conflict, version/amendment finding, QCO/certification
> claim — references one or more `evidence` rows. The explanation service is given
> evidence, not unrestricted context. If a finding cannot be grounded, it is
> stored `REVIEW_REQUIRED` and shown as such. This is how MORPHEUS keeps AI output
> traceable and abstains honestly.

## 1. Evidence entity

```
evidence(
  id, source_type, source_name, source_url?,
  document_id?, page?, section?, text,
  retrieved_at, checksum_sha256, relationship_type?, data_origin
)
```

`source_type` ∈ `tender_document | standard_record | standard_relationship |
standard_version | amendment | qco_record | certification_record`.

- **Tender evidence** points at a `document_id` + `page` + `section` and stores the
  exact passage (`text`) that triggered a requirement or a conflict. `checksum` is
  over the passage so a later edit is detectable.
- **Standard/relationship/QCO evidence** points at the authoritative (or curated /
  demo) record via `source_url`/`source_name` and `data_origin`, storing the
  permitted metadata/passage that supports the claim. We store metadata,
  relationships, permitted content and authoritative source URLs — **not**
  copyrighted standard PDFs (`security.md §data-use`).

## 2. What each finding must cite

| Finding | Required evidence |
|---|---|
| Requirement | tender passage (page/section) it was extracted from |
| Recommendation | ≥1 evidence per claimed match role (scope / parameter / relationship) |
| Coverage result | the tender requirement passage and/or the standard record showing the requirement kind |
| Gap | the standard/authoritative record showing the expected requirement the tender lacks |
| Conflict | **both** conflicting passages (source_a and source_b) |
| Version finding | the tender reference passage + the standard version/supersession record |
| Amendment finding | the amendment record + affected-clause metadata |
| QCO / certification | the authoritative QCO/certification record only |

A finding whose required evidence is absent is **not** emitted as a confident
result: it is stored with `confidence = REVIEW_REQUIRED` and routed to human
review. This is enforced in code by an `assert_grounded(finding, roles)` guard
before persistence.

## 3. Grounding the LLM

The explainer/classifier receive a bounded payload:
```json
{ "requirement": {...}, "standard": {is_number,title,scope,...},
  "evidence": [ {id:"E-102", text:"…", source_name:"…", data_origin:"CURATED"} ] }
```
The prompt: *"Answer only from `evidence`. Cite ids you used in `used_evidence_ids`.
If evidence is insufficient, set confidence REVIEW_REQUIRED."* Post-validation:
- any `used_evidence_id` not in the payload ⇒ force `REVIEW_REQUIRED`;
- a regulatory/legal claim with no `qco_record`/`certification_record` evidence ⇒
  stripped and flagged.
The UI renders the prose **beside** the cited evidence passages so the officer
verifies rather than trusts.

## 4. Evidence → confidence

Confidence for a grounded finding is a labelled function of evidence, not a guess:
```
HIGH             ≥1 evidence with data_origin ∈ {AUTHORITATIVE, CURATED}
                 AND all required roles satisfied
MEDIUM           roles satisfied but only DEMO_SYNTHETIC / partial evidence
LOW              weak/partial evidence, single role
REVIEW_REQUIRED  required roles unsatisfied → abstain
```
`data_origin=DEMO_SYNTHETIC` can never yield `HIGH`, so demo data cannot
masquerade as authoritative certainty.

## 5. Evidence snapshots (immutability for audit)

When an officer decides (`review_decisions`), the AI output **and** the evidence
(ids + text) are snapshotted into the decision row. Later edits to a standard or
re-analysis never rewrite what the officer saw. Reports embed the same snapshot so
a generated report is reproducible and defensible.

## 6. Retrieval date & provenance everywhere

Every evidence row carries `retrieved_at` and `source_name`/`source_url`/
`data_origin`. Recommendations, standards, QCO and certification views surface
these, satisfying the product rule that findings show *source* and *retrieval
date*, and that authoritative status is never invented — it is shown with its
provenance or marked unknown.
