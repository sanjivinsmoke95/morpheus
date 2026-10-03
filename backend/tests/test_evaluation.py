"""Phase 7: evaluation harness + baseline comparison."""

from app.services.evaluation.harness import run_evaluation
from app.services.standards.seed import seed_demo_standards
from tests.conftest import API, login


def _prepare(db_sessionmaker):
    db = db_sessionmaker()
    seed_demo_standards(db)
    rows = run_evaluation(db)
    db.close()
    return rows


def test_harness_produces_metrics_for_all_methods(client, db_sessionmaker):
    _prepare(db_sessionmaker)
    admin = login(client, "admin@example.com")
    s = client.get(f"{API}/evaluation", headers=admin).json()
    methods = {m["method"] for m in s["methods"]}
    assert {"keyword", "vector", "hybrid", "morpheus"} <= methods
    for m in s["methods"]:
        assert 0.0 <= m["precision_at_5"] <= 1.0
        assert 0.0 <= m["mrr"] <= 1.0
    # Morpheus grounds recommendations in verified evidence.
    morph = next(m for m in s["methods"] if m["method"] == "morpheus")
    assert morph["evidence_precision"] is not None
    assert 0.0 <= morph["evidence_precision"] <= 1.0

    # Verify dynamically calculated safety audit metrics
    assert "safety_audit" in s
    assert 0.0 <= s["safety_audit"]["hallucination_rate"] <= 1.0
    assert 0.0 <= s["safety_audit"]["unsupported_rate"] <= 1.0
    assert 0.0 <= s["safety_audit"]["citation_correctness"] <= 1.0
    assert 0.0 <= s["safety_audit"]["adversarial_abstention_rate"] <= 1.0


def test_evidence_precision_dynamically_changes_with_support(client, db_sessionmaker):
    """Dynamic evidence precision test: metric drops when scope evidence is missing."""
    from sqlalchemy import select
    from app.models import EvaluationCase, Standard
    from app.services.evaluation.harness import evaluate_case, seed_eval_cases

    db = db_sessionmaker()
    seed_demo_standards(db)
    seed_eval_cases(db)
    case = db.execute(select(EvaluationCase).where(EvaluationCase.name == "distribution-transformer")).scalar_one()

    # Baseline evaluation with full evidence corpus
    res_full = evaluate_case(db, case)
    baseline_precision = res_full["morpheus"]["evidence_precision"]
    assert 0.0 <= baseline_precision <= 1.0

    # Temporarily clear scope of key standard IS 1180 to degrade evidence support
    std_1180 = db.execute(select(Standard).where(Standard.is_number.like("%1180%"))).scalars().first()
    original_scope = std_1180.scope
    try:
        std_1180.scope = ""
        db.flush()
        res_degraded = evaluate_case(db, case)
        degraded_precision = res_degraded["morpheus"]["evidence_precision"]
        # Precision must dynamically drop when scope evidence is removed
        assert degraded_precision < baseline_precision
        assert 0.0 <= degraded_precision <= 1.0
    finally:
        std_1180.scope = original_scope
        db.flush()
        db.close()


def test_morpheus_differs_from_hybrid_ranking(client, db_sessionmaker):
    """Verify that MORPHEUS multi-factor reranking changes candidate rankings and scores vs pure HYBRID."""
    from sqlalchemy import select
    from app.models import EvaluationCase
    from app.services.evaluation.harness import evaluate_case, seed_eval_cases

    db = db_sessionmaker()
    seed_demo_standards(db)
    seed_eval_cases(db)
    case = db.execute(select(EvaluationCase).where(EvaluationCase.name == "distribution-transformer")).scalar_one()
    res = evaluate_case(db, case)

    # In distribution transformer case, HYBRID retrieves high-lexical overlap motors (IS 325, IS 12615)
    # whereas MORPHEUS applies domain classification & tier scoring to prioritize power & distribution transformers
    # resulting in equal or better nDCG.
    hybrid_ndcg = res["hybrid"]["ndcg_at_5"]
    morpheus_ndcg = res["morpheus"]["ndcg_at_5"]
    assert morpheus_ndcg >= hybrid_ndcg

    # Across all benchmark cases, MORPHEUS and HYBRID produce distinct ranking profiles
    all_cases = db.execute(select(EvaluationCase)).scalars().all()
    differing_cases = 0
    for c in all_cases:
        c_res = evaluate_case(db, c)
        if c_res["morpheus"]["ndcg_at_5"] != c_res["hybrid"]["ndcg_at_5"]:
            differing_cases += 1
    # Multiple cases must exhibit distinct ranking due to applicability reasoning
    assert differing_cases >= 5
    db.close()


def test_hybrid_beats_or_matches_baselines(client, db_sessionmaker):
    _prepare(db_sessionmaker)
    admin = login(client, "admin@example.com")
    s = client.get(f"{API}/evaluation", headers=admin).json()
    by = {m["method"]: m for m in s["methods"]}
    # Hybrid recall@5 should be >= each single-signal baseline on this gold set.
    assert by["hybrid"]["recall_at_5"] >= by["keyword"]["recall_at_5"] - 1e-9
    assert by["hybrid"]["recall_at_5"] >= by["vector"]["recall_at_5"] - 1e-9


def test_evaluation_rbac(client, db_sessionmaker):
    _prepare(db_sessionmaker)
    officer = login(client, "officer@example.com")
    assert client.get(f"{API}/evaluation", headers=officer).status_code == 403  # admin/reviewer only
    # But anyone can see the labelled cases.
    assert client.get(f"{API}/evaluation/cases", headers=officer).json()


def test_no_hand_entered_metrics():
    # There is no API path that writes a metric; only /evaluation/run (harness) does.
    from app.api.routers import evaluation as ev
    paths = {r.path for r in ev.router.routes}
    assert paths == {"/evaluation", "/evaluation/cases", "/evaluation/run"}
