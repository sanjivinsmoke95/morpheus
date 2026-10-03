"""Hybrid retrieval: BM25 (lexical) + vector (semantic) + metadata signals, fused
transparently into a relevance BAND (search-ranking.md). No LLM. Scores are
internal; the user sees HIGH/MEDIUM/LOW and the contributing signals.

For the demo/dev scale this runs in Python over the stored corpus (portable to
SQLite). Production swaps lexical→Postgres FTS and vector→pgvector HNSW behind
this same interface.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Standard, StandardChunk
from app.services.ai import get_embedder
from app.services.classification.parameters import audit_requirement_parameters

_TOKEN = re.compile(r"[a-z0-9]+")

# Fusion weights (single source of tuning). Sum ≈ 1.0.
WEIGHTS = {
    "semantic": 0.30, "lexical": 0.20, "scope_match": 0.15, "product_match": 0.12,
    "parameter_match": 0.08, "material_match": 0.07, "sector_match": 0.05, "graph_support": 0.03,
}
_K1, _B = 1.5, 0.75


def _tok(text: str) -> list[str]:
    return _TOKEN.findall((text or "").lower())


@dataclass
class Candidate:
    standard: Standard
    lexical: float
    semantic: float
    signals: dict[str, float]
    score: float = 0.0
    relevance: str = "LOW"
    matched_chunk: str = ""
    retrieval_method: str = "hybrid"
    evidence_terms: list[str] = field(default_factory=list)


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return max(0.0, dot)  # inputs are L2-normalized; clamp negatives to 0


class _Bm25:
    def __init__(self, docs: dict[str, list[str]]):
        self.docs = docs
        self.N = len(docs) or 1
        self.avgdl = (sum(len(d) for d in docs.values()) / self.N) if docs else 0.0
        df: dict[str, int] = {}
        for toks in docs.values():
            for t in set(toks):
                df[t] = df.get(t, 0) + 1
        self.idf = {t: math.log(1 + (self.N - n + 0.5) / (n + 0.5)) for t, n in df.items()}

    def score(self, sid: str, q_tokens: list[str]) -> float:
        toks = self.docs.get(sid, [])
        if not toks:
            return 0.0
        tf: dict[str, int] = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        dl = len(toks)
        s = 0.0
        for qt in set(q_tokens):
            if qt not in tf:
                continue
            idf = self.idf.get(qt, 0.0)
            f = tf[qt]
            s += idf * (f * (_K1 + 1)) / (f + _K1 * (1 - _B + _B * dl / self.avgdl))
        return s


def _searchable(std: Standard) -> str:
    return " ".join([
        std.title or "", std.scope or "", " ".join(std.keywords or []),
        " ".join(std.product_categories or []), " ".join(std.materials or []), std.sector or "",
    ])


_DOMAIN_GROUPS = [
    {"transformer"},
    {"motor", "induction motor", "bldc"},
    {"pump", "centrifugal pump", "rotodynamic pump"},
    {"luminaire", "led", "lighting", "street light"},
    {"cable", "conductor", "wiring"},
    {"battery", "lithium", "storage battery"},
    {"switchgear", "circuit breaker", "mcb"},
    {"structural steel", "steel section"},
    {"pipe", "potable water", "hdpe pipe"},
    {"concrete", "cement", "rcc"},
    {"valve", "fitting"},
]


def _detect_category_conflict(profile_text: str, std_categories: list[str]) -> bool:
    if not profile_text or not std_categories:
        return False
    prof_groups = [g for g in _DOMAIN_GROUPS if any(kw in profile_text for kw in g)]
    if not prof_groups:
        return False
    std_groups = []
    for cat in std_categories:
        for g in _DOMAIN_GROUPS:
            if any(kw in cat.lower() for kw in g):
                std_groups.append(g)
    if not std_groups:
        return False
    has_common = any(sg in prof_groups for sg in std_groups)
    return not has_common


def retrieve_for_requirement(
    db: Session,
    requirement,
    analysis_sector: str = "",
    product_profile: dict | None = None,
    *,
    top_k: int = 5,
) -> list[Candidate]:
    standards = list(db.execute(select(Standard)).scalars())
    if not standards:
        return []
    chunks_by_std: dict[str, list[StandardChunk]] = {}
    for ch in db.execute(select(StandardChunk)).scalars():
        chunks_by_std.setdefault(ch.standard_id, []).append(ch)

    # Query text: requirement description + its attribute keys/units.
    attr_terms = []
    for a in getattr(requirement, "attributes", []) or []:
        attr_terms += [a.get("key", ""), a.get("unit", "")]
    q_text = f"{requirement.description} {' '.join(attr_terms)}"
    q_tokens = _tok(q_text)
    q_desc_low = requirement.description.lower()
    attrs = getattr(requirement, "attributes", []) or []
    param_keys = {a.get("key", "") for a in attrs}

    bm25 = _Bm25({s.id: _tok(_searchable(s)) for s in standards})
    q_vec = get_embedder().embed([q_text])[0]

    raw: list[Candidate] = []
    lex_max = 0.0
    for s in standards:
        lex = bm25.score(s.id, q_tokens)
        lex_max = max(lex_max, lex)
        best_sem, best_chunk = 0.0, ""
        for ch in chunks_by_std.get(s.id, []):
            c = _cosine(q_vec, ch.embedding or [])
            if c > best_sem:
                best_sem, best_chunk = c, ch.content
        signals = _signals(s, q_desc_low, param_keys, analysis_sector, q_tokens, product_profile, attributes=attrs)
        raw.append(Candidate(standard=s, lexical=lex, semantic=best_sem, signals=signals, matched_chunk=best_chunk))

    semantic_mode = get_embedder().is_semantic
    for c in raw:
        c.lexical = (c.lexical / lex_max) if lex_max else 0.0  # normalize lexical to [0,1]
        prod_weight_val = c.signals["product_match"]
        c.score = (
            WEIGHTS["semantic"] * c.semantic
            + WEIGHTS["lexical"] * c.lexical
            + WEIGHTS["scope_match"] * c.signals["scope_match"]
            + WEIGHTS["product_match"] * max(0.0, prod_weight_val)
            + WEIGHTS["parameter_match"] * max(0.0, c.signals["parameter_match"])
            + WEIGHTS["material_match"] * c.signals["material_match"]
            + WEIGHTS["sector_match"] * c.signals["sector_match"]
        )
        # Apply conflict penalty if product domains clash
        if c.signals.get("product_conflict"):
            c.score = max(0.0, c.score - 0.25)
        # Apply conflict penalty if technical parameters clash (e.g. 33 kV on a 1100 V cable standard)
        if c.signals.get("parameter_conflict"):
            c.score = max(0.0, c.score - 0.25)
        # Boost explicitly cited standards so they are retrieved in top_k
        if c.signals.get("is_cited"):
            c.score += 0.35
        # Apply installation and phase alignment bonuses
        if c.signals.get("installation_match"):
            c.score += 0.03
        if c.signals.get("phase_match"):
            c.score += 0.03

        c.relevance = _band(c.score, c.semantic, c.signals, c.lexical, semantic_mode)
        c.retrieval_method = "semantic+lexical" if semantic_mode else "deterministic"

    raw.sort(key=lambda c: c.score, reverse=True)
    return raw[:top_k]


def _strong_deterministic(signals: dict, lexical: float) -> bool:
    """A confident match from hard signals alone — used so good matches reach HIGH
    even in offline mode instead of collapsing to MEDIUM. Not a probability."""
    if signals.get("product_conflict") or signals.get("parameter_conflict"):
        return False
    if signals.get("is_cited"):
        return True
    hard = signals.get("product_match", 0.0) + signals.get("parameter_match", 0.0)
    return (hard >= 1.0 and signals.get("scope_match", 0.0) >= 0.3) or \
           (signals.get("product_match", 0.0) >= 1.0 and lexical >= 0.6)


def _matches_category(cat: str, text: str) -> bool:
    if not cat or not text:
        return False
    cat_low = cat.lower()
    text_low = text.lower()
    if cat_low in text_low:
        return True
    cat_words = [w for w in _TOKEN.findall(cat_low) if len(w) >= 3]
    if cat_words and all(w.rstrip("s") in text_low for w in cat_words):
        return True
    return False


def _signals(
    std: Standard,
    q_desc_low: str,
    param_keys: set[str],
    analysis_sector: str,
    q_tokens: list[str],
    product_profile: dict | None = None,
    attributes: list[dict[str, Any]] | None = None,
) -> dict:
    std_categories = [p.lower() for p in (std.product_categories or [])]
    product_match = 1.0 if any(_matches_category(p, q_desc_low) for p in std_categories) else 0.0
    material_match = 1.0 if any(m.lower() in q_desc_low for m in (std.materials or [])) else 0.0
    scope_tokens = set(_tok(std.scope))
    overlap = len(set(q_tokens) & scope_tokens)
    scope_match = min(1.0, overlap / 6.0)

    # Sector match
    sec = (product_profile.get("sector") if product_profile else analysis_sector) or ""
    sector_match = 1.0 if sec and std.sector and sec.lower() == std.sector.lower() else 0.0

    std_text = (std.scope + " " + " ".join(std.keywords or [])).lower()
    parameter_match = 1.0 if param_keys and any(k and k in std_text for k in param_keys) else 0.0
    parameter_conflict = False
    parameter_details = ""

    # Real normalized parameter audit (Phase 8 & Part 4)
    all_eval_params = list(attributes or [])
    if product_profile and product_profile.get("parameters"):
        for pk, pv in product_profile["parameters"].items():
            if not any(a.get("key") == pk for a in all_eval_params):
                all_eval_params.append({"key": pk, "raw_value": str(pv)})

    if all_eval_params:
        p_score, p_res, has_p_conflict = audit_requirement_parameters(all_eval_params, std_text)
        if has_p_conflict:
            parameter_conflict = True
            parameter_match = -0.50
            parameter_details = next((r.details for r in p_res if r.status == "CONFLICT"), "")
        elif p_score > 0:
            parameter_match = max(parameter_match, p_score)

    product_conflict = False
    installation_match = False
    phase_match = False

    if product_profile:
        prof_prod = (product_profile.get("product") or "").lower()
        prof_cat = (product_profile.get("product_category") or product_profile.get("category") or "").lower()
        combined_prof = f"{prof_prod} {prof_cat}".strip()

        # If profile matches candidate standard's product categories
        if any(_matches_category(cat, combined_prof) or _matches_category(combined_prof, cat) for cat in std_categories):
            product_match = 1.0
        elif _detect_category_conflict(combined_prof, std_categories):
            product_conflict = True
            product_match = -0.30

        # Installation match
        prof_inst = (product_profile.get("installation") or "").lower()
        if prof_inst and prof_inst in std_text:
            installation_match = True

        # Phase match
        prof_phases = product_profile.get("phases")
        if prof_phases == 3 and any(k in std_text for k in ("three phase", "3-phase", "three-phase")):
            phase_match = True
        elif prof_phases == 1 and any(k in std_text for k in ("single phase", "1-phase", "single-phase")):
            phase_match = True

    is_cited = False
    if std.is_number:
        m = re.search(r"\bIS\s*[-/:]?\s*(\d{3,5})\b", std.is_number, re.IGNORECASE)
        if m:
            num = m.group(1)
            if re.search(rf"\bis\s*[-/:]?\s*{num}\b", q_desc_low, re.IGNORECASE):
                is_cited = True
        elif std.is_number.lower() in q_desc_low:
            is_cited = True

    if is_cited:
        product_conflict = False
        product_match = 1.0

    return {
        "product_match": product_match,
        "material_match": material_match,
        "scope_match": round(scope_match, 3),
        "sector_match": sector_match,
        "parameter_match": parameter_match,
        "parameter_conflict": parameter_conflict,
        "parameter_details": parameter_details,
        "graph_support": 0.0,
        "product_conflict": product_conflict,
        "installation_match": installation_match,
        "phase_match": phase_match,
        "is_cited": is_cited,
    }


def _band(score: float, semantic: float, signals: dict, lexical: float, semantic_mode: bool) -> str:
    """Relevance band (search-ranking.md §5)."""
    if signals.get("product_conflict") or signals.get("parameter_conflict"):
        return "LOW"
    strong = _strong_deterministic(signals, lexical)
    if score >= 0.55 and (semantic >= 0.55 or strong):
        return "HIGH"
    if score >= 0.34 or strong:
        return "MEDIUM"
    return "LOW"
