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
