"""Runs Alembic migrations programmatically at app startup (see main.py's lifespan),
so `uvicorn --reload` stays the only command needed for local dev - no separate
manual migration step to remember."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config

_BACKEND_DIR = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    config = Config(str(_BACKEND_DIR / "alembic.ini"))
    command.upgrade(config, "head")
