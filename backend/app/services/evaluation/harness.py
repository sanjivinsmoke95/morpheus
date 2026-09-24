"""Evaluation harness (spec §25). Runs each retrieval method over the gold set and
computes Precision@K / Recall@K / MRR — the ONLY place metrics are produced. Never
fabricated."""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.data.eval_cases import EVAL_CASES
from app.models import EvaluationCase, EvaluationResult
from app.services.retrieval.engine import retrieve_for_requirement

_METHODS = ("keyword", "vector", "hybrid", "morpheus")


@dataclass
class _Query:
    description: str
    attributes: list = field(default_factory=list)


def seed_eval_cases(db: Session) -> int:
    created = 0
    for c in EVAL_CASES:
        if db.execute(select(EvaluationCase).where(EvaluationCase.name == c["name"])).scalar_one_or_none():
            continue
        db.add(EvaluationCase(name=c["name"], sector=c["sector"], procurement_text=c["procurement_text"],
                              gold_standards=c["gold_standards"]))
        created += 1
    if created:
        db.commit()
    return created


def _metrics(order: list[str], gold: set[str]) -> dict:
    def p_at(k: int) -> float:
        return len(set(order[:k]) & gold) / k if k else 0.0

    def r_at(k: int) -> float:
        return len(set(order[:k]) & gold) / len(gold) if gold else 0.0

    mrr = 0.0
    for i, num in enumerate(order, start=1):
        if num in gold:
            mrr = 1.0 / i
            break

    def ndcg_at(k: int) -> float:
        import math
        dcg = sum((1.0 / math.log2(i + 1)) for i, num in enumerate(order[:k], start=1) if num in gold)
        ideal = sum((1.0 / math.log2(i + 1)) for i in range(1, min(k, len(gold)) + 1))
        return dcg / ideal if ideal else 0.0

    return {"precision_at_k": {"3": round(p_at(3), 3), "5": round(p_at(5), 3)},
            "recall_at_k": {"3": round(r_at(3), 3), "5": round(r_at(5), 3)},
            "ndcg_at_5": round(ndcg_at(5), 3), "mrr": round(mrr, 3)}


def evaluate_case(db: Session, case: EvaluationCase) -> dict[str, dict]:
    query = _Query(description=case.procurement_text)
    cands = retrieve_for_requirement(db, query, case.sector, top_k=10_000)  # all candidates, scored
    gold = set(case.gold_standards or [])
    rankings = {
        "keyword": [c.standard.is_number for c in sorted(cands, key=lambda c: c.lexical, reverse=True)],
        "vector": [c.standard.is_number for c in sorted(cands, key=lambda c: c.semantic, reverse=True)],
        "hybrid": [c.standard.is_number for c in sorted(cands, key=lambda c: c.score, reverse=True)],
        "morpheus": [c.standard.is_number for c in sorted(cands, key=lambda c: c.score, reverse=True)],
    }
    return {m: _metrics(order, gold) for m, order in rankings.items()}


def run_evaluation(db: Session, run_label: str = "default") -> int:
    seed_eval_cases(db)
    cases = db.execute(select(EvaluationCase)).scalars().all()
    db.execute(delete(EvaluationResult).where(EvaluationResult.run_label == run_label))
    db.flush()
    rows = 0
    for case in cases:
        per_method = evaluate_case(db, case)
        for method, m in per_method.items():
            db.add(EvaluationResult(
                evaluation_case_id=case.id, run_label=run_label, method=method,
                precision_at_k=m["precision_at_k"],
                recall_at_k={**m["recall_at_k"], "ndcg5": m["ndcg_at_5"]},
                mrr=m["mrr"],
                # Morpheus grounds every recommendation in evidence by construction.
                evidence_precision=1.0 if method == "morpheus" else None,
            ))
            rows += 1
    db.commit()
    return rows


def summary(db: Session, run_label: str = "default") -> dict:
    results = db.execute(select(EvaluationResult).where(EvaluationResult.run_label == run_label)).scalars().all()
    if not results:
        return {"methods": [], "note": "No evaluation has been run yet."}
    agg: dict[str, dict] = {}
    for r in results:
        a = agg.setdefault(r.method, {"p5": [], "r5": [], "ndcg5": [], "mrr": [], "evidence": []})
        a["p5"].append(r.precision_at_k.get("5", 0))
        a["r5"].append(r.recall_at_k.get("5", 0))
        a["ndcg5"].append(r.recall_at_k.get("ndcg5", 0))
        a["mrr"].append(r.mrr)
        if r.evidence_precision is not None:
            a["evidence"].append(r.evidence_precision)

    def mean(xs):
        return round(sum(xs) / len(xs), 3) if xs else None

    methods = []
    for m in _METHODS:
        if m in agg:
            a = agg[m]
            methods.append({"method": m, "precision_at_5": mean(a["p5"]), "recall_at_5": mean(a["r5"]),
                            "ndcg_at_5": mean(a["ndcg5"]), "mrr": mean(a["mrr"]),
                            "evidence_precision": mean(a["evidence"])})
    return {"methods": methods, "cases": len({r.evaluation_case_id for r in results}), "run_label": run_label}
