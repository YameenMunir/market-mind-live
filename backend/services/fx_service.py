from __future__ import annotations

import logging
from datetime import datetime, timezone

from config import get_settings
from data.yfinance_provider import provider
from models.schemas import FxRates
from utils.cache import cache

logger = logging.getLogger(__name__)
settings = get_settings()

# Major currencies users can switch the display to, beyond the USD base. Each is fetched
# as the Yahoo pair "{code}USD=X", which consistently means "USD per 1 unit of {code}" -
# unlike the ambiguous "{code}=X" shorthand, whose quote direction varies by currency.
SUPPORTED_CURRENCIES = ["GBP", "EUR", "CAD", "AUD", "JPY", "CHF", "INR", "CNY", "SGD"]


def get_fx_rates() -> FxRates:
    def _fetch() -> FxRates:
        rates: dict[str, float] = {"USD": 1.0}
        for code in SUPPORTED_CURRENCIES:
            try:
                quote = provider.get_quote(f"{code}USD=X")
                rates[code] = quote["price"]
            except Exception:
                # One bad/unavailable pair shouldn't take down the whole rates response -
                # skip it and let the frontend fall back to native (unconverted) display
                # for that currency.
                logger.warning("Could not fetch FX rate for %s, skipping.", code, exc_info=True)

        return FxRates(base="USD", rates=rates, as_of=datetime.now(timezone.utc).isoformat())

    return cache.get_or_set("fx:rates", settings.fx_cache_ttl_seconds, _fetch)
