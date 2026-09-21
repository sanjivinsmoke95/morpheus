.PHONY: help up down be-install be-dev be-test migrate fe-install fe-dev fe-build

help:
	@echo "up          - docker compose up (db, neo4j, backend, frontend)"
	@echo "down        - docker compose down"
	@echo "be-install  - create backend venv + install"
	@echo "be-dev      - run backend on :8010 (SQLite)"
	@echo "be-test     - run backend tests"
	@echo "migrate     - alembic upgrade head"
	@echo "fe-install  - install frontend deps"
	@echo "fe-dev      - run frontend on :5174"

up:
	docker compose up --build

down:
	docker compose down

be-install:
	cd backend && python3.11 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

be-dev:
	cd backend && DATABASE_URL="sqlite:///./dev.db" ENVIRONMENT=development ./.venv/bin/uvicorn app.main:app --reload --port 8010

be-test:
	cd backend && ENVIRONMENT=test ./.venv/bin/python -m pytest -q

migrate:
	cd backend && ./.venv/bin/alembic upgrade head

fe-install:
	cd frontend && npm install

fe-dev:
	cd frontend && npm run dev
