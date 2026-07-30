"""Covers the input sanitization, deduplication, and relevance-ranking added to
data/symbols.py's asset search - previously unvalidated input reached the cache key/
outbound Yahoo request unchanged, and the curated-directory fallback path returned
matches in plain declaration order with no exact-match preference or de-duplication.
"""

from __future__ import annotations

import data.symbols as symbols_module
from data.symbols import _dedupe_by_symbol, _relevance_rank, _sanitize_query, search_symbols
from models.schemas import AssetType
from utils.cache import cache


def test_sanitize_query_strips_control_characters():
    assert _sanitize_query("AAPL\x00\x01") == "AAPL"


def test_sanitize_query_strips_surrounding_whitespace():
    assert _sanitize_query("  AAPL  ") == "AAPL"


def test_sanitize_query_caps_length():
    assert len(_sanitize_query("A" * 500)) == 100


def test_relevance_rank_prefers_exact_symbol_match_over_substring_name_match():
    exact = {"symbol": "V", "name": "Visa Inc."}
    substring_name = {"symbol": "NVDA", "name": "NVIDIA Corporation"}  # contains "v"
    assert _relevance_rank(exact, "V") < _relevance_rank(substring_name, "V")


def test_relevance_rank_prefers_symbol_prefix_over_name_only_match():
    prefix = {"symbol": "AAPL", "name": "Apple Inc."}
    name_only = {"symbol": "MSFT", "name": "Apple Music Reseller"}  # contrived
    assert _relevance_rank(prefix, "AAPL") < _relevance_rank(name_only, "AAPL")


def test_dedupe_by_symbol_keeps_first_occurrence():
    results = [
        {"symbol": "aapl", "name": "Apple (first)"},
        {"symbol": "AAPL", "name": "Apple (duplicate)"},
        {"symbol": "MSFT", "name": "Microsoft"},
    ]
    deduped = _dedupe_by_symbol(results)
    assert [r["symbol"] for r in deduped] == ["aapl", "MSFT"]
    assert deduped[0]["name"] == "Apple (first)"


def test_search_symbols_ranks_exact_ticker_match_first_in_fallback(monkeypatch):
    """When Yahoo's live suggestion endpoint returns nothing (rate-limited, network
    error, or genuinely no matches), the curated-directory fallback must rank an exact
    ticker match above an unrelated entry that merely contains the query text."""
    monkeypatch.setattr(symbols_module, "_fetch_yahoo_suggestions", lambda query, limit=15: [])
    monkeypatch.setattr(symbols_module, "_hydrate_results_with_quotes", lambda results: None)

    results = search_symbols("V", limit=15)
    symbols = [r["symbol"] for r in results]
    assert symbols[0] == "V"


def test_search_symbols_sanitizes_before_building_cache_key(monkeypatch):
    """A query differing only by control characters/whitespace must resolve to the
    same cache entry - otherwise sanitization would silently defeat caching for
    input that looks identical to the user but hits the cache under a different key
    on every call."""
    test_symbol = "ZZTESTSYM"
    cache._store.pop(f"search_suggestions:{test_symbol}:ALL", None)
    calls = {"n": 0}

    def _fake_uncached(query, asset_type, limit):
        calls["n"] += 1
        return [{"symbol": test_symbol, "name": "Test Co.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ", "logo_url": None}]

    monkeypatch.setattr(symbols_module, "_search_symbols_uncached", _fake_uncached)

    search_symbols(test_symbol)
    search_symbols(f"  {test_symbol}\x00  ")

    assert calls["n"] == 1
