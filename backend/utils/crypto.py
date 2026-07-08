"""Symmetric encryption for secrets we store at rest (currently: per-device Gemini API
keys in db/models.py::GeminiKeyRecord). Never used for anything that needs to be
recoverable by the frontend - only the backend ever decrypts.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from cryptography.fernet import Fernet

from config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def _cipher() -> Fernet:
    settings = get_settings()
    secret = settings.ai_key_encryption_secret
    if not secret:
        # Dev-only fallback: a key generated fresh each process start means anything
        # encrypted with it becomes unreadable after a restart (the user just re-enters
        # their key - low stakes, not financial data). Production deployments should set
        # AI_KEY_ENCRYPTION_SECRET explicitly so stored keys survive redeploys/restarts.
        secret = Fernet.generate_key().decode()
        logger.warning(
            "AI_KEY_ENCRYPTION_SECRET is not set - using a generated in-memory key. "
            "Stored Gemini API keys will not survive a process restart. Set "
            "AI_KEY_ENCRYPTION_SECRET in production to avoid this."
        )
    return Fernet(secret.encode())


def encrypt_secret(plaintext: str) -> str:
    return _cipher().encrypt(plaintext.encode()).decode()


def decrypt_secret(token: str) -> str:
    return _cipher().decrypt(token.encode()).decode()
