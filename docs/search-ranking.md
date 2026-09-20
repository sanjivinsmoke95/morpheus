# MORPHEUS — Search & Ranking

> Three retrieval baselines (keyword, vector, hybrid) plus a transparent fusion
> ranker. Scoring is **explainable**: every candidate carries its per-signal
> contributions (`signals_json`), and the user sees a `Relevance` band
> (HIGH/MEDIUM/LOW) — never a raw number dressed up as a "probability". The eval
> harness compares all four methods on the labelled gold set (`evaluation`).

## 1. Query construction

For each **normalized requirement** we build a query object:
```
{ text: description, product: <extracted product>, material: <extracted material>,
  sector: <analysis sector>, params: [{key,value,unit,comparator}],
  referenced_standards: [...], hs_code?: <if available> }
```
Retrieval runs per requirement (and a document-level query for
product/sector-wide standards).

## 2. Baseline A — Keyword / BM25 (lexical)

Postgres full-text (`tsvector`/`tsquery`) over `title`, `scope`, `keywords`,
`product_categories`, `materials`, `sector`. `ts_rank_cd` gives the lexical score.
Cheap, exact on standard numbers and domain terms, weak on paraphrase.

## 3. Baseline B — Semantic / vector

`requirement_embeddings` vs `standard_chunks.embedding` via pgvector cosine (HNSW
index). We embed: the requirement description **and** its normalized technical
representation; and, per standard, `title+scope+metadata` (and any permitted
excerpt) as separate chunks. Best-chunk cosine is the semantic score. Strong on
paraphrase, weak on exact identifiers/units.

## 4. Baseline C — Hybrid fusion (the ranker)

Candidates from A ∪ B are scored on transparent signals, each normalized to
[0,1]:

| Signal | Meaning | Source |
|---|---|---|
| `lexical` | BM25 rank (min-max normalized) | A |
| `semantic` | best-chunk cosine | B |
| `product_match` | requirement product ∈ standard `product_categories` | metadata |
| `material_match` | material overlap | metadata |
| `scope_match` | requirement terms present in standard `scope` (token/embedding) | metadata + B |
| `sector_match` | analysis sector == standard sector | metadata |
| `parameter_match` | a normalized parameter falls in the standard's stated range/kind | normalization + metadata |
| `graph_support` | reached via a typed relationship from an already-strong candidate | graph |

**Fusion** = weighted sum with fixed, versioned weights (config, not learned in
v1), computed on rank-normalized inputs to avoid scale bias:
```
score = 0.30*semantic + 0.20*lexical + 0.15*scope_match + 0.12*product_match
      + 0.08*parameter_match + 0.07*material_match + 0.05*sector_match
      + 0.03*graph_support
```
Weights live in `retrieval/weights.py`, are shown in the evaluation view, and are
the single place tuning happens. (Reciprocal-rank fusion of A and B is available
as an alternative combiner for the eval comparison.)

## 5. Score → Relevance band (what the user sees)

`relevance_score` (the fused value) is **internal**. The UI shows a band via fixed
thresholds, plus the top contributing signals:
```
HIGH   score ≥ 0.62  and semantic ≥ 0.55
MEDIUM 0.40 ≤ score < 0.62
LOW    score < 0.40
```
The recommendation card reads e.g. *"Relevance: HIGH — strong scope & product
match, parameter match on pressure"*, not *"0.71 probability"*. Bands and
thresholds are documented and versioned; they are **not** presented as accuracy.

## 6. Optional rerank

A cross-encoder reranker (provider-abstracted, off by default) can reorder the top
N by (requirement, standard scope) relevance. It only **reorders**; it cannot
introduce a standard not already retrieved, and its contribution is logged as a
signal so the effect is auditable in the eval dashboard.

## 7. "Why not this standard?" signals

Excluded/low candidates persist `signals_json` + `exclusion_reason`, derived
mechanically:
- `scope_mismatch`: `scope_match` below floor;
- `product_mismatch`: product not in categories;
- `parameter_mismatch`: normalized parameter outside the standard's kind/range;
- `weaker_evidence`: fewer/lower-origin evidence than the primary;
- `classification_reason`: rule gate produced `NOT_APPLICABLE`/`RELATED`.
The UI shows these stored reasons — no free-form AI justification without a signal
behind it.

## 8. Alternatives

When multiple candidates for a requirement clear MEDIUM and differ by less than a
configured margin, we mark one `is_primary` and the rest `alternatives`, and
compute their **differences** from the signal vectors (e.g. "IS-A stronger on
testing scope; IS-B current version, IS-A superseded"). The system does not force
a single answer when signals + evidence support several.

## 9. Evaluation (no fabricated metrics)

`evaluation/harness.py` runs each method over `evaluation_cases` and computes
`Precision@K`, `Recall@K`, `MRR`, `Applicability F1`, evidence precision, gap
precision, abstention rate — writing `evaluation_results` per method. The
dashboard compares keyword vs vector vs hybrid vs Morpheus-final. Metrics exist
**only** as outputs of this harness on the gold set; there is no code path that
lets a metric be set by hand.
