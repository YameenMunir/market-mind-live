"""Curated symbol directory used for asset search.

yfinance has no reliable public search endpoint, so the search feature is backed by
this local directory (symbol, name, type, exchange). Live quotes/candles for any
chosen symbol are still fetched live from yfinance - only the "search suggestions"
step uses static metadata.
"""

from __future__ import annotations

from models.schemas import AssetType

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


def search_symbols(query: str, asset_type: AssetType | None = None, limit: int = 15) -> list[dict]:
    q = query.strip().upper()
    results = []
    for entry in SYMBOL_DIRECTORY:
        if asset_type and entry["asset_type"] != asset_type:
            continue
        if not q or q in entry["symbol"].upper() or q in entry["name"].upper():
            results.append(entry)
        if len(results) >= limit:
            break
    return results


def lookup_symbol(symbol: str) -> dict | None:
    for entry in SYMBOL_DIRECTORY:
        if entry["symbol"].upper() == symbol.upper():
            return entry
    return None
