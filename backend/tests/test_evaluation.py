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
    # Morpheus grounds every recommendation → evidence precision 1.0.
    morph = next(m for m in s["methods"] if m["method"] == "morpheus")
    assert morph["evidence_precision"] == 1.0


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
