-- Enable pgvector so embedding columns (Phase 2 retrieval) work out of the box.
CREATE EXTENSION IF NOT EXISTS vector;
