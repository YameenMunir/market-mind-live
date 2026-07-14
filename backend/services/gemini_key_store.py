"""Database-backed, device-scoped Gemini API key storage (BYOK). Encrypted at rest via
utils/crypto.py; the decrypted key is only ever read by services/ai_insights_service.py
right before calling Gemini - it is never returned from an API response."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from cryptography.fernet import InvalidToken
from sqlmodel import Session

from db.models import GeminiKeyRecord
from db.session import engine
from models.schemas import GeminiKeyStatus
from services.gemini_service import looks_like_valid_key_format
from utils.crypto import decrypt_secret, encrypt_secret
from utils.errors import ValidationError

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _mask(api_key: str) -> str:
    tail = api_key[-4:] if len(api_key) >= 4 else api_key
    return f"{'•' * 8}{tail}"


class GeminiKeyStore:
    def get_status(self, device_id: str) -> GeminiKeyStatus:
        with Session(engine) as session:
            record = session.get(GeminiKeyRecord, device_id)
        if record is None:
            return GeminiKeyStatus(has_key=False)
        try:
            masked_key = _mask(decrypt_secret(record.encrypted_api_key))
        except InvalidToken:
            self._warn_undecryptable(device_id)
            return GeminiKeyStatus(has_key=False)
        return GeminiKeyStatus(has_key=True, masked_key=masked_key, updated_at=record.updated_at)

    def get_decrypted_key(self, device_id: str) -> str | None:
        with Session(engine) as session:
            record = session.get(GeminiKeyRecord, device_id)
        if record is None:
            return None
        try:
            return decrypt_secret(record.encrypted_api_key)
        except InvalidToken:
            self._warn_undecryptable(device_id)
            return None

    @staticmethod
    def _warn_undecryptable(device_id: str) -> None:
        # Only possible if AI_KEY_ENCRYPTION_SECRET changed since this key was
        # stored - most commonly, no secret was configured at all, so
        # utils/crypto.py generated a fresh one for this process and any key
        # encrypted under a previous process's secret is now permanently
        # unreadable (not just temporarily unavailable). Treated as "no key
        # configured" so callers fall back to the server-wide GEMINI_API_KEY (if
        # any) or the mock provider instead of the whole chat request crashing on
        # an unhandled InvalidToken - the user just needs to re-enter their key.
        logger.warning(
            "Stored Gemini API key for device=%s is undecryptable (stale/rotated "
            "encryption secret) - treating as absent. Set AI_KEY_ENCRYPTION_SECRET "
            "to a stable value to stop this from recurring on every restart.",
            device_id,
        )

    def set_key(self, device_id: str, api_key: str) -> GeminiKeyStatus:
        if not looks_like_valid_key_format(api_key):
            raise ValidationError(
                "That doesn't look like a valid Gemini API key.",
                detail='Google AI Studio keys start with "AIza" and are 39 characters long - '
                "get one at https://aistudio.google.com/apikey.",
            )
        encrypted = encrypt_secret(api_key)
        now = _now_iso()
        with Session(engine) as session:
            record = session.get(GeminiKeyRecord, device_id)
            if record is None:
                record = GeminiKeyRecord(
                    device_id=device_id, encrypted_api_key=encrypted, created_at=now, updated_at=now
                )
            else:
                record.encrypted_api_key = encrypted
                record.updated_at = now
            session.add(record)
            session.commit()
        return GeminiKeyStatus(has_key=True, masked_key=_mask(api_key), updated_at=now)

    def delete_key(self, device_id: str) -> None:
        with Session(engine) as session:
            record = session.get(GeminiKeyRecord, device_id)
            if record is not None:
                session.delete(record)
                session.commit()


gemini_key_store = GeminiKeyStore()
