"""Database-backed, device-scoped Gemini API key storage (BYOK). Encrypted at rest via
utils/crypto.py; the decrypted key is only ever read by services/ai_insights_service.py
right before calling Gemini - it is never returned from an API response."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session

from db.models import GeminiKeyRecord
from db.session import engine
from models.schemas import GeminiKeyStatus
from utils.crypto import decrypt_secret, encrypt_secret


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
        return GeminiKeyStatus(
            has_key=True,
            masked_key=_mask(decrypt_secret(record.encrypted_api_key)),
            updated_at=record.updated_at,
        )

    def get_decrypted_key(self, device_id: str) -> str | None:
        with Session(engine) as session:
            record = session.get(GeminiKeyRecord, device_id)
        if record is None:
            return None
        return decrypt_secret(record.encrypted_api_key)

    def set_key(self, device_id: str, api_key: str) -> GeminiKeyStatus:
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
