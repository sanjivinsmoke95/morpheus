# Procurement Export

`GET /analyses/{id}/export` returns a structured, machine-readable JSON package of the
entire analysis. The PDF **compliance annex** is the existing audit report (`POST /reports`).

## Package contents

- **tender** — title, document, sector, pages, workflow status
- **product_profile** — derived category / sub-category / parameters (Phase 1)
- **languages** — detected languages per page (Phase 3)
- **decision_trace** — the concise pipeline steps (Phase 8)
- **requirements[]** — each with normalized parameters and its **applicable_standards**
  (applicability, match %, retrieval method, `why[]`, and per-standard **provenance**)
- **coverage_matrix** — requirement → standard → FULL/PARTIAL/MISSING
- **conflicts**, **gaps** — unit-normalized conflicts, potential gaps (never "mandatory"
  without evidence)
- **qco_certification** — QCO/cert records with provenance
- **gfr_review** — GFR 2017 advisory flags (Phase 16)
- **provenance_legend** — DEMO_SYNTHETIC / PUBLIC_METADATA / VERIFIED_RECORD / REVIEW_REQUIRED

## GeM / CPPP

This is a **GeM / CPPP integration-ready export** — a clean structured artifact that a
GeM/CPPP integration could consume. It is **not a live integration**; nothing is pushed to
any external portal. The UI labels it accordingly.
