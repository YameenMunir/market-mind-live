"""Covers services/news_digest_service.py: the mock (no-Gemini-key) fallback, the live
Gemini path, falling back to mock when a live call fails, the empty-news case, and
that a digest is actually cached (not regenerated on every call).
"""

from __future__ import annotations

import asyncio

import pytest

import services.news_digest_service as news_digest_service
from models.schemas import NewsArticle, NewsFeed
from services.gemini_service import GeminiProviderError
from utils.cache import cache

SYMBOL = "TESTCO"


@pytest.fixture(autouse=True)
def _clean_cache():
    """The cache module is a process-wide singleton - scrub this test's key before
    and after so runs don't interfere with each other or leak into other test files."""
    key = f"news_digest:{SYMBOL}"
    cache._store.pop(key, None)
    yield
    cache._store.pop(key, None)


def _fake_news(article_count: int = 3) -> NewsFeed:
    articles = [
        NewsArticle(
            title=f"Headline {i}",
            summary=f"Summary of headline {i}.",
            url=f"https://example.com/{i}",
            publisher="Example Wire",
            published_at="2026-08-01T12:00:00Z",
        )
        for i in range(article_count)
    ]
    return NewsFeed(symbol=SYMBOL, articles=articles, as_of="2026-08-01T12:00:00Z")


def test_no_gemini_key_uses_mock_digest(monkeypatch):
    monkeypatch.setattr(news_digest_service, "get_news", lambda symbol, count: _fake_news())
    monkeypatch.setattr(news_digest_service.gemini_key_store, "get_decrypted_key", lambda device_id: None)
    settings = news_digest_service.get_settings()
    monkeypatch.setattr(settings, "gemini_api_key", None)

    digest = asyncio.run(news_digest_service.get_news_digest(SYMBOL, "device-1"))

    assert digest.provider == "mock"
    assert digest.based_on_article_count == 3
    assert "Headline 0" in digest.summary


def test_empty_news_returns_no_headlines_message_without_calling_gemini(monkeypatch):
    monkeypatch.setattr(news_digest_service, "get_news", lambda symbol, count: _fake_news(0))
    called = {"n": 0}

    async def _should_not_be_called(**kwargs):
        called["n"] += 1
        return "should not happen"

    monkeypatch.setattr(news_digest_service.gemini_service, "generate_reply", _should_not_be_called)
    monkeypatch.setattr(news_digest_service.gemini_key_store, "get_decrypted_key", lambda device_id: "AIzafakefakefakefakefakefakefakefakefa")

    digest = asyncio.run(news_digest_service.get_news_digest(SYMBOL, "device-1"))

    assert digest.based_on_article_count == 0
    assert "No recent headlines" in digest.summary
    assert called["n"] == 0


def test_live_gemini_key_generates_ai_digest(monkeypatch):
    monkeypatch.setattr(news_digest_service, "get_news", lambda symbol, count: _fake_news())
    monkeypatch.setattr(news_digest_service.gemini_key_store, "get_decrypted_key", lambda device_id: "AIzafakefakefakefakefakefakefakefakefa")

    async def _fake_generate_reply(**kwargs):
        assert "Headline 0" in kwargs["system_instruction"]
        return "AI-generated digest text."

    monkeypatch.setattr(news_digest_service.gemini_service, "generate_reply", _fake_generate_reply)

    digest = asyncio.run(news_digest_service.get_news_digest(SYMBOL, "device-1"))

    assert digest.provider == "gemini"
    assert digest.summary == "AI-generated digest text."


def test_gemini_failure_falls_back_to_mock_digest(monkeypatch):
    monkeypatch.setattr(news_digest_service, "get_news", lambda symbol, count: _fake_news())
    monkeypatch.setattr(news_digest_service.gemini_key_store, "get_decrypted_key", lambda device_id: "AIzafakefakefakefakefakefakefakefakefa")

    async def _fail(**kwargs):
        raise GeminiProviderError("Gemini is down.")

    monkeypatch.setattr(news_digest_service.gemini_service, "generate_reply", _fail)

    digest = asyncio.run(news_digest_service.get_news_digest(SYMBOL, "device-1"))

    assert digest.provider == "mock"
    assert "Headline 0" in digest.summary


def test_digest_is_cached_not_regenerated_on_second_call(monkeypatch):
    monkeypatch.setattr(news_digest_service, "get_news", lambda symbol, count: _fake_news())
    monkeypatch.setattr(news_digest_service.gemini_key_store, "get_decrypted_key", lambda device_id: "AIzafakefakefakefakefakefakefakefakefa")

    calls = {"n": 0}

    async def _fake_generate_reply(**kwargs):
        calls["n"] += 1
        return f"Generated #{calls['n']}"

    monkeypatch.setattr(news_digest_service.gemini_service, "generate_reply", _fake_generate_reply)

    first = asyncio.run(news_digest_service.get_news_digest(SYMBOL, "device-1"))
    second = asyncio.run(news_digest_service.get_news_digest(SYMBOL, "device-1"))

    assert calls["n"] == 1
    assert first.summary == second.summary == "Generated #1"
