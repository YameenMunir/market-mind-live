"""Curated symbol directory and live Yahoo Finance search lookup.

Suggestions are fetched live from Yahoo's suggestion API with caching and fallback
to local listings in case of network outages or rate limiting.
"""

from __future__ import annotations

from models.schemas import AssetType, MarketSession
from utils.cache import cache

SYMBOL_DIRECTORY: list[dict] = [
    # Stocks
    {"symbol": "AAPL", "name": "Apple Inc.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "NFLX", "name": "Netflix Inc.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "asset_type": AssetType.STOCK, "exchange": "NYSE"},
    {"symbol": "V", "name": "Visa Inc.", "asset_type": AssetType.STOCK, "exchange": "NYSE"},
    {"symbol": "WMT", "name": "Walmart Inc.", "asset_type": AssetType.STOCK, "exchange": "NYSE"},
    {"symbol": "DIS", "name": "The Walt Disney Company", "asset_type": AssetType.STOCK, "exchange": "NYSE"},
    {"symbol": "BA", "name": "The Boeing Company", "asset_type": AssetType.STOCK, "exchange": "NYSE"},
    {"symbol": "AMD", "name": "Advanced Micro Devices Inc.", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    {"symbol": "INTC", "name": "Intel Corporation", "asset_type": AssetType.STOCK, "exchange": "NASDAQ"},
    # ETFs
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "asset_type": AssetType.ETF, "exchange": "NYSEARCA"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "asset_type": AssetType.ETF, "exchange": "NASDAQ"},
    {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "asset_type": AssetType.ETF, "exchange": "NYSEARCA"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "asset_type": AssetType.ETF, "exchange": "NYSEARCA"},
    {"symbol": "ARKK", "name": "ARK Innovation ETF", "asset_type": AssetType.ETF, "exchange": "NYSEARCA"},
    {"symbol": "XLE", "name": "Energy Select Sector SPDR Fund", "asset_type": AssetType.ETF, "exchange": "NYSEARCA"},
    {"symbol": "XLF", "name": "Financial Select Sector SPDR Fund", "asset_type": AssetType.ETF, "exchange": "NYSEARCA"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "asset_type": AssetType.ETF, "exchange": "NYSEARCA"},
    # Crypto
    {"symbol": "BTC-USD", "name": "Bitcoin", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    {"symbol": "ETH-USD", "name": "Ethereum", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    {"symbol": "SOL-USD", "name": "Solana", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    {"symbol": "BNB-USD", "name": "BNB", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    {"symbol": "XRP-USD", "name": "XRP", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    {"symbol": "ADA-USD", "name": "Cardano", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    {"symbol": "DOGE-USD", "name": "Dogecoin", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    {"symbol": "AVAX-USD", "name": "Avalanche", "asset_type": AssetType.CRYPTO, "exchange": "CCC"},
    # Forex
    {"symbol": "EURUSD=X", "name": "Euro / US Dollar", "asset_type": AssetType.FOREX, "exchange": "FX"},
    {"symbol": "GBPUSD=X", "name": "British Pound / US Dollar", "asset_type": AssetType.FOREX, "exchange": "FX"},
    {"symbol": "USDJPY=X", "name": "US Dollar / Japanese Yen", "asset_type": AssetType.FOREX, "exchange": "FX"},
    {"symbol": "AUDUSD=X", "name": "Australian Dollar / US Dollar", "asset_type": AssetType.FOREX, "exchange": "FX"},
    {"symbol": "USDCAD=X", "name": "US Dollar / Canadian Dollar", "asset_type": AssetType.FOREX, "exchange": "FX"},
    {"symbol": "USDCHF=X", "name": "US Dollar / Swiss Franc", "asset_type": AssetType.FOREX, "exchange": "FX"},
    # Commodities (futures)
    {"symbol": "GC=F", "name": "Gold Futures", "asset_type": AssetType.COMMODITY, "exchange": "COMEX"},
    {"symbol": "SI=F", "name": "Silver Futures", "asset_type": AssetType.COMMODITY, "exchange": "COMEX"},
    {"symbol": "CL=F", "name": "Crude Oil WTI Futures", "asset_type": AssetType.COMMODITY, "exchange": "NYMEX"},
    {"symbol": "NG=F", "name": "Natural Gas Futures", "asset_type": AssetType.COMMODITY, "exchange": "NYMEX"},
    {"symbol": "ZC=F", "name": "Corn Futures", "asset_type": AssetType.COMMODITY, "exchange": "CBOT"},
    {"symbol": "HG=F", "name": "Copper Futures", "asset_type": AssetType.COMMODITY, "exchange": "COMEX"},
    # Indices
    {"symbol": "^GSPC", "name": "S&P 500", "asset_type": AssetType.INDEX, "exchange": "INDEX"},
    {"symbol": "^DJI", "name": "Dow Jones Industrial Average", "asset_type": AssetType.INDEX, "exchange": "INDEX"},
    {"symbol": "^IXIC", "name": "NASDAQ Composite", "asset_type": AssetType.INDEX, "exchange": "INDEX"},
    {"symbol": "^RUT", "name": "Russell 2000", "asset_type": AssetType.INDEX, "exchange": "INDEX"},
    {"symbol": "^VIX", "name": "CBOE Volatility Index", "asset_type": AssetType.INDEX, "exchange": "INDEX"},
    {"symbol": "^FTSE", "name": "FTSE 100", "asset_type": AssetType.INDEX, "exchange": "INDEX"},
]

_EXCHANGE_MAP = {
    "NMS": "NASDAQ",
    "NYQ": "NYSE",
    "ASE": "AMEX",
    "NCM": "NASDAQ",
    "NGM": "NASDAQ",
    "CCC": "Crypto",
    "FX": "Forex",
    "CMX": "COMEX",
    "NYM": "NYMEX",
    "CBT": "CBOT",
    "INDEX": "Index",
    "LSE": "London Stock Exchange",
    "MIL": "Borsa Italiana",
    "PAR": "Euronext Paris",
    "FRA": "Deutsche Börse (Frankfurt)",
    "GER": "Deutsche Börse (Frankfurt)",
    "EIL": "Irish Stock Exchange",
    "ISE": "Irish Stock Exchange",
    "TSE": "Tokyo Stock Exchange",
    "HKG": "Hong Kong Stock Exchange",
    "BSE": "Bombay Stock Exchange",
    "NSE": "National Stock Exchange of India",
    "ASX": "Australian Securities Exchange",
    "TSX": "Toronto Stock Exchange",
    "SAO": "B3 (São Paulo)",
    "JNB": "Johannesburg Stock Exchange",
}

_ASSET_TYPE_MAP = {
    "EQUITY": AssetType.STOCK,
    "ETF": AssetType.ETF,
    "MUTUALFUND": AssetType.ETF,
    "CRYPTOCURRENCY": AssetType.CRYPTO,
    "CURRENCY": AssetType.FOREX,
    "COMMODITY": AssetType.COMMODITY,
    "FUTURE": AssetType.COMMODITY,
    "INDEX": AssetType.INDEX,
}


def _fetch_yahoo_suggestions(query: str, limit: int = 15) -> list[dict]:
    """Hits Yahoo's (unofficial) search endpoint through the same retry/cooldown
    machinery as every other Yahoo call in data/yfinance_provider.py. Previously this
    called `requests.get` directly - a plain 429/403 here never fed the shared
    IP-wide cooldown that ticker/quote calls trigger and respect, even though Yahoo's
    throttling isn't endpoint-specific, so unthrottled search traffic could both
    contribute to a block and keep hammering Yahoo during one instead of backing off
    with everything else."""
    from data.yfinance_provider import _call_with_retry, _get_session
    from utils.errors import AppError

    url = "https://query2.finance.yahoo.com/v1/finance/search"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    params = {
        "q": query,
        "quotesCount": limit,
        "newsCount": 0,
        "enableFuzzyQuery": "true"
    }

    def _fetch() -> list[dict]:
        # Shares the same curl_cffi session (browser impersonation + the
        # Windows-only cert-verification workaround) that every other Yahoo call
        # in yfinance_provider.py already goes through, rather than a second,
        # unhardened plain `requests` client - this endpoint hit the identical
        # Windows SSL verification gap that session was built to work around.
        response = _get_session().get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json().get("quotes", [])

    try:
        return _call_with_retry(_fetch, description=f"search_suggestions({query})")
    except AppError:
        # Rate-limited, in an active cooldown, or unreachable after retries - degrade
        # to the local curated directory fallback (see _search_symbols_uncached)
        # rather than surfacing an error for a type-ahead suggestion list.
        return []


def _hydrate_results_with_quotes(results: list[dict]) -> None:
    """Fetches display quotes for search results through price_service (not the
    provider directly) so this shares the same quote cache, self-throttle, and
    cache-hit-skip batching that every other quote lookup goes through - a search
    result and a subsequent dashboard open for the same symbol now hit the network
    at most once between them instead of twice, and search traffic is finally
    counted against the rate limiter meant to protect the whole process."""
    if not results:
        return

    from services import price_service
    from services.market_status_service import get_market_status

    symbols = [r["symbol"] for r in results]
    try:
        quotes = price_service.get_quotes_batch(symbols)
    except Exception:
        quotes = {}

    for r in results:
        sym = r["symbol"]
        quote = quotes.get(sym.upper())

        price = None
        change_percent = None
        currency = "USD"

        if quote is not None and not isinstance(quote, Exception):
            price = quote.price
            change_percent = quote.change_percent
            currency = quote.currency or "USD"

        r["price"] = price
        r["change_percent"] = change_percent
        r["currency"] = currency

        try:
            status = get_market_status(sym, asset_type=r["asset_type"])
            r["market_status"] = status.session
        except Exception:
            r["market_status"] = None


def _search_symbols_uncached(query: str, asset_type: AssetType | None, limit: int) -> list[dict]:
    q = query.strip()
    if not q:
        # Return default popular symbols when search query is empty
        results = []
        for entry in SYMBOL_DIRECTORY:
            if asset_type and entry["asset_type"] != asset_type:
                continue
            results.append(dict(entry))
            if len(results) >= limit:
                break
        _hydrate_results_with_quotes(results)
        return results

    raw_quotes = _fetch_yahoo_suggestions(q, limit=limit)
    results = []

    for quote in raw_quotes:
        symbol = quote.get("symbol")
        if not symbol:
            continue

        name = quote.get("shortname") or quote.get("longname") or symbol
        exch_code = quote.get("exchange")
        exchange = _EXCHANGE_MAP.get(exch_code, exch_code or "Unknown")

        raw_type = quote.get("quoteType")
        mapped_type = _ASSET_TYPE_MAP.get(raw_type)
        if not mapped_type:
            from data.provider import infer_asset_type
            mapped_type = infer_asset_type(symbol)

        if asset_type and mapped_type != asset_type:
            continue

        results.append({
            "symbol": symbol,
            "name": name,
            "asset_type": mapped_type,
            "exchange": exchange,
            "logo_url": None
        })

    _hydrate_results_with_quotes(results)

    # Fallback to local curated suggestions if Yahoo search returns nothing
    if not results:
        for entry in SYMBOL_DIRECTORY:
            if asset_type and entry["asset_type"] != asset_type:
                continue
            uq = q.upper()
            if uq in entry["symbol"].upper() or uq in entry["name"].upper():
                results.append(dict(entry))
            if len(results) >= limit:
                break
        _hydrate_results_with_quotes(results)

    return results


def search_symbols(query: str, asset_type: AssetType | None = None, limit: int = 15) -> list[dict]:
    cache_key = f"search_suggestions:{query.upper()}:{asset_type.value if asset_type else 'ALL'}"
    return cache.get_or_set(
        cache_key,
        60,
        lambda: _search_symbols_uncached(query, asset_type, limit)
    )


def lookup_symbol(symbol: str) -> dict | None:
    # First search locally
    for entry in SYMBOL_DIRECTORY:
        if entry["symbol"].upper() == symbol.upper():
            return entry

    # Fetch live single quote to resolve exchange and name if not curated
    raw_quotes = _fetch_yahoo_suggestions(symbol, limit=1)
    if raw_quotes:
        quote = raw_quotes[0]
        symbol = quote.get("symbol", symbol)
        name = quote.get("shortname") or quote.get("longname") or symbol
        exch_code = quote.get("exchange")
        exchange = _EXCHANGE_MAP.get(exch_code, exch_code or "Unknown")
        
        raw_type = quote.get("quoteType")
        mapped_type = _ASSET_TYPE_MAP.get(raw_type)
        if not mapped_type:
            from data.provider import infer_asset_type
            mapped_type = infer_asset_type(symbol)
            
        return {
            "symbol": symbol,
            "name": name,
            "asset_type": mapped_type,
            "exchange": exchange,
            "logo_url": None
        }

    return None
