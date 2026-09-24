# AI Providers

MORPHEUS depends only on two interfaces (`LLMProvider`, `EmbeddingProvider` in
`app/services/ai/base.py`). Concrete providers plug in behind them. With **no API
key the system runs fully offline** on deterministic engines — extraction (rules),
retrieval (BM25 + a hashing embedder), classification (rule gate). Real providers
only *upgrade quality*; they never bypass the evidence + rule gates.

## Modes

| Mode | Embedding | Retrieval label | When |
|---|---|---|---|
| **Offline deterministic** (default) | hashing stub (`is_semantic = false`) | `deterministic` | no key set |
| **Semantic AI** | real embedding model (`is_semantic = true`) | `semantic+lexical` | key set |

The UI shows which mode produced a recommendation (never calls the hashing stub
"semantic").

## Configuration (`backend/.env`)

OpenAI-compatible (OpenAI, Azure, local vLLM/Ollama):
```
LLM_PROVIDER=openai_compatible
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
EMBEDDING_PROVIDER=openai_compatible
EMBEDDING_API_KEY=sk-...        # falls back to LLM_API_KEY if unset
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIM=1536
```

Google Gemini:
```
LLM_PROVIDER=gemini
LLM_API_KEY=...
LLM_MODEL=gemini-1.5-flash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIM=768
```

## What each provider is used for

- **LLM** (`complete_json` / `complete_text`): may *propose* requirement extraction
  and an applicability class. Deterministic evidence + the rule gate downstream are
  authoritative — the LLM never overrides a hard match, and on any failure it returns
  `{"_abstain": true}` so the item becomes `REVIEW_REQUIRED` (never a guess).
- **Embedder** (`embed`): semantic vectors for the hybrid retrieval leg. Vectors are
  L2-normalized; on failure the call degrades to zeros (lexical + signals still rank).

## Guarantees

- Offline tests are hermetic — no provider is contacted without a key.
- Switching providers is a config change; no code change.
- Real providers use only the standard library (`urllib`) — no extra dependency.
- **Limitation:** the real-provider path requires a valid API key to run end to end;
  it cannot be exercised in the offline CI suite. The offline deterministic path is
  fully tested.
