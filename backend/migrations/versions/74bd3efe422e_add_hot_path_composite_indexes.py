"""add hot-path composite indexes

Revision ID: 74bd3efe422e
Revises: 1efb1d0f0ad7
Create Date: 2026-07-18 21:21:01.836855

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '74bd3efe422e'
down_revision: Union[str, Sequence[str], None] = '1efb1d0f0ad7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Both composite indexes back queries that already existed but only had a
    single-column index to work with:

    - alertrecord(symbol, status): services/alert_store.py's `evaluate()` runs this
      exact (symbol, status='active') filter on every live-hub poll tick for every
      actively-watched symbol - previously only `symbol` was indexed, so status still
      had to be filtered by a row scan across every alert for that symbol.
    - chatmessagerecord(session_id, created_at): every message read/append
      (services/chat_store.py: get_history, append's overflow trim, the new grouped
      count in list_sessions) filters by session_id and orders by created_at -
      previously only `session_id` was indexed, leaving the ORDER BY unindexed.
    """
    op.create_index(
        "ix_alertrecord_symbol_status", "alertrecord", ["symbol", "status"], unique=False
    )
    op.create_index(
        "ix_chatmessagerecord_session_id_created_at",
        "chatmessagerecord",
        ["session_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_chatmessagerecord_session_id_created_at", table_name="chatmessagerecord")
    op.drop_index("ix_alertrecord_symbol_status", table_name="alertrecord")
