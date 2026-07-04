from __future__ import annotations

import logging
import socket

import pandas as pd
import yfinance as yf

from data.provider import MarketDataProvider
from utils.errors import InvalidSymbolError, NetworkError

logger = logging.getLogger(__name__)


class YFinanceProvider(MarketDataProvider):
    """Live market data via the unofficial Yahoo Finance API (yfinance).

    No API key required. Polling-based (no native streaming), so the WebSocket
    layer polls this provider on an interval and pushes updates to clients.
    """

    def get_quote(self, symbol: str) -> dict:
        ticker = yf.Ticker(symbol)
        try:
            fast_info = ticker.fast_info
            last_price = fast_info.get("lastPrice") or fast_info.get("last_price")
            previous_close = fast_info.get("previousClose") or fast_info.get("previous_close")
            day_high = fast_info.get("dayHigh") or fast_info.get("day_high")
            day_low = fast_info.get("dayLow") or fast_info.get("day_low")
            volume = fast_info.get("lastVolume") or fast_info.get("last_volume")
            currency = fast_info.get("currency") or "USD"
        except (socket.gaierror, ConnectionError, TimeoutError) as exc:
            raise NetworkError("Unable to reach the market data source.", detail=str(exc)) from exc
        except Exception as exc:  # yfinance raises bare Exception/KeyError for bad symbols
            raise InvalidSymbolError(
                f"'{symbol}' is not a recognized asset symbol.", detail=str(exc)
            ) from exc

        if last_price is None or previous_close is None:
            history = self._safe_history(symbol, period="5d", interval="1d")
            if history.empty:
                raise InvalidSymbolError(f"No market data available for '{symbol}'.")
            last_row = history.iloc[-1]
            prev_row = history.iloc[-2] if len(history) > 1 else last_row
            last_price = float(last_row["Close"])
            previous_close = float(prev_row["Close"])
            day_high = float(last_row["High"])
            day_low = float(last_row["Low"])
            volume = float(last_row["Volume"])

        if last_price is None or previous_close in (None, 0):
            raise InvalidSymbolError(f"No market data available for '{symbol}'.")

        return {
            "price": float(last_price),
            "previous_close": float(previous_close),
            "day_high": float(day_high) if day_high is not None else None,
            "day_low": float(day_low) if day_low is not None else None,
            "volume": float(volume) if volume is not None else None,
            "currency": currency,
        }

    def get_history(self, symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
        return self._safe_history(symbol, period=period, interval=interval)

    def get_analyst_consensus(self, symbol: str) -> dict:
        ticker = yf.Ticker(symbol)

        try:
            targets = ticker.analyst_price_targets or {}
        except (socket.gaierror, ConnectionError, TimeoutError) as exc:
            raise NetworkError("Unable to reach the market data source.", detail=str(exc)) from exc
        except Exception:
            # No analyst coverage for this symbol is a normal outcome here (crypto,
            # forex, commodities, indices, and many small caps all lack coverage),
            # not a real error - fall back to an empty result rather than raising.
            targets = {}

        counts = {"strong_buy": 0, "buy": 0, "hold": 0, "sell": 0, "strong_sell": 0}
        try:
            trend = ticker.recommendations
        except (socket.gaierror, ConnectionError, TimeoutError) as exc:
            raise NetworkError("Unable to reach the market data source.", detail=str(exc)) from exc
        except Exception:
            trend = None

        if trend is not None and not trend.empty:
            current = trend[trend["period"] == "0m"]
            row = current.iloc[0] if not current.empty else trend.iloc[0]
            counts = {
                "strong_buy": int(row.get("strongBuy", 0) or 0),
                "buy": int(row.get("buy", 0) or 0),
                "hold": int(row.get("hold", 0) or 0),
                "sell": int(row.get("sell", 0) or 0),
                "strong_sell": int(row.get("strongSell", 0) or 0),
            }

        return {
            "price_target_low": targets.get("low"),
            "price_target_high": targets.get("high"),
            "price_target_mean": targets.get("mean"),
            "price_target_median": targets.get("median"),
            **counts,
        }

    def _safe_history(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval, auto_adjust=False)
        except (socket.gaierror, ConnectionError, TimeoutError) as exc:
            raise NetworkError("Unable to reach the market data source.", detail=str(exc)) from exc
        except Exception as exc:
            raise InvalidSymbolError(
                f"'{symbol}' is not a recognized asset symbol.", detail=str(exc)
            ) from exc

        if df is None or df.empty:
            raise InvalidSymbolError(f"No historical data available for '{symbol}'.")
        return df


provider = YFinanceProvider()
