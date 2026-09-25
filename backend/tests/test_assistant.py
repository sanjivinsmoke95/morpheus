"""Grounded Ask MORPHEUS / Copilot assistant.

Verifies the shared GroundedAnalysisAssistant: when an LLM is configured it
synthesises a cited answer over retrieved evidence, it abstains when the model
says so, it never emits a citation that isn't real evidence (grounding guard),
and — with no LLM (the stub) — it still returns a deterministic grounded answer
through the /ask API.
"""

from app.services.ai.base import LLMProvider
from app.services.ai.grounded import GroundedAnalysisAssistant
from tests.conftest import API, login
from tests.test_slice_e2e import _seed_and_run


class FakeLLM(LLMProvider):
    """An LLM stand-in that returns a scripted JSON object, so the grounded path
    is exercised without network/credentials."""
    name = "fake"

    def __init__(self, payload: dict):
        self._payload = payload

    @property
    def available(self) -> bool:
        return True

    def complete_json(self, prompt, schema=None, *, temperature=0.0, max_retries=2) -> dict:
        # Prove the model actually receives the retrieved evidence as context.
        assert "EVIDENCE for this analysis" in prompt
        assert "[S1]" in prompt
        return self._payload

    def complete_text(self, prompt, *, temperature=0.2) -> str:
        return ""


def test_llm_path_synthesises_and_cites(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)

    db = db_sessionmaker()
    llm = FakeLLM({"answer": "IS 1520 : 2007 covers pump performance testing [S1].",
                   "source_ids": ["S1"], "confidence": "high", "abstained": False, "reason": None})
    ans = GroundedAnalysisAssistant(db, llm=llm).answer(analysis_id, "Why was IS 1520 matched?")
    db.close()

    assert ans.engine == "llm:fake"
    assert not ans.abstained
    assert "IS 1520" in ans.answer
    assert ans.sources, "a substantive answer must carry sources"
    # Every cited source is real retrieved evidence, not fabricated.
    assert all(s["ref"].startswith("S") and s["text"] for s in ans.sources)


def test_llm_can_abstain(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)

    db = db_sessionmaker()
    llm = FakeLLM({"answer": "I couldn't verify that from the available evidence.",
                   "source_ids": [], "confidence": "low", "abstained": True,
                   "reason": "no evidence about delivery timelines"})
    ans = GroundedAnalysisAssistant(db, llm=llm).answer(analysis_id, "What is the delivery deadline?")
    db.close()

    assert ans.abstained
    assert ans.reason and "delivery" in ans.reason


def test_grounding_guard_drops_fake_citations(client, db_sessionmaker):
    """If the model cites a source id that wasn't retrieved, it must not appear as
    a citation — the answer falls back to real retrieved sources."""
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)

    db = db_sessionmaker()
    llm = FakeLLM({"answer": "See [S99].", "source_ids": ["S99"],
                   "confidence": "medium", "abstained": False, "reason": None})
    ans = GroundedAnalysisAssistant(db, llm=llm).answer(analysis_id, "Which standards apply to the motor?")
    db.close()

    assert not ans.abstained
    assert all(s["ref"] != "S99" for s in ans.sources)  # the fabricated id is gone
    assert ans.sources  # but the answer is still grounded in real evidence


def test_ask_api_deterministic_without_llm(client, db_sessionmaker):
    """With the stub (no LLM), /ask still returns a grounded, cited answer."""
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)

    r = client.post(f"{API}/analyses/{analysis_id}/ask", headers=h,
                    json={"question": "Which standards are QCO mandatory?"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert {"answer", "abstained", "citations", "sources", "engine", "confidence"} <= set(body)
    assert body["engine"] == "deterministic"


def test_ask_empty_question_abstains(client, db_sessionmaker):
    h = login(client)
    analysis_id = _seed_and_run(client, db_sessionmaker, h)
    r = client.post(f"{API}/analyses/{analysis_id}/ask", headers=h, json={"question": "  "})
    assert r.status_code == 200
    assert r.json()["abstained"] is True
