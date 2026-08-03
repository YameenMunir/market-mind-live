"""Shared pytest fixtures for the whole backend test suite."""

from __future__ import annotations

import pytest

from db.migrate import run_migrations


@pytest.fixture(scope="session", autouse=True)
def _migrated_database():
    """Ensures the database schema exists before any test runs - mirrors exactly what
    main.py's lifespan does at real app startup.

    Without this, any test that touches the database (directly, e.g.
    tests/test_history_store.py, or indirectly via a cache fallback table, e.g.
    tests/test_analyst_service.py) only passes by accident when run against a
    developer's machine that already has a migrated backend/market_mind.db lying
    around from a previous `uvicorn main:app` run - and fails with "no such table" in
    any genuinely fresh environment (a new clone, CI, a freshly created venv) where
    the app has never actually been started first. Session-scoped so this runs once,
    not once per test; Alembic migrations are idempotent, so re-running them against
    an already-migrated database is a safe no-op.
    """
    run_migrations()
