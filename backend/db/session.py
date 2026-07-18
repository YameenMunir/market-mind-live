"""SQLite engine + session dependency for the app's persistence layer (alerts, AI
chat sessions, prediction history - see backend/db/models.py).

Existing routers (e.g. backend/api/alerts.py) are plain `def`, not `async def`, so
FastAPI already runs them in a threadpool - a sync SQLModel/SQLAlchemy session fits
that exact style with no event-loop-blocking concern.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import event
from sqlmodel import Session, create_engine

from config import get_settings

settings = get_settings()

_is_sqlite = settings.database_url.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}
# SQLite ignores pool_size/max_overflow (it's a single file, not a network service)
# and create_engine rejects them for its dialect - only pass pool tuning to a real
# server-backed database (e.g. a future Postgres deployment, per config.py's
# database_url docstring). pool_pre_ping guards against a connection that went stale
# while idle in the pool (e.g. the DB server closed it) being handed to a request and
# failing instead of being transparently replaced.
_pool_kwargs = {} if _is_sqlite else {"pool_size": 10, "max_overflow": 20, "pool_pre_ping": True, "pool_recycle": 1800}
engine = create_engine(settings.database_url, connect_args=_connect_args, **_pool_kwargs)


if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
        # WAL mode + a busy timeout let the live hub's background pollers (writing
        # triggered alerts) and API requests read/write the same file concurrently
        # without hitting "database is locked" errors.
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
