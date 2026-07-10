import type { AssetType } from "@/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000";

// Backend requests should normally resolve in a few seconds (see backend/config.py's
// provider_max_retries/cooldown settings) - this is a generous upper bound that still
// tolerates a cold start on a free-tier host, so a genuinely hung request fails fast
// into the existing network_error fallback UI instead of leaving a card stuck on
// "Loading..." indefinitely.
export const REQUEST_TIMEOUT_MS = 25_000;

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  forex: "Forex",
  commodity: "Commodities",
  index: "Indices",
};

// Chart time-range options, ordered shortest to longest. Each `value` is sent to
// the backend as the `range` query param, which picks both how far back to fetch and
// what candle size to render server-side (see backend/services/price_service.py).
export const CHART_RANGES = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1W", value: "1wk" },
  { label: "2W", value: "2wk" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
  { label: "MAX", value: "max" },
] as const;

export const DEFAULT_SYMBOL = "AAPL";
export const QUOTE_POLL_FALLBACK_MS = 8000;
// Fallback poll cadence for a range not present in CANDLE_POLL_MS_BY_RANGE.
export const CANDLE_POLL_MS = 30000;

// Poll cadence per chart range - mirrors the cache_ttl_seconds tiers in backend/services/
// price_service.py's RANGE_CONFIG, so the frontend doesn't poll faster than the server-side
// cache would actually produce a fresh answer, and long ranges (whose bars barely change)
// aren't re-fetched needlessly often.
export const CANDLE_POLL_MS_BY_RANGE: Record<string, number> = {
  "1d": 15_000,
  "5d": 15_000,
  "1wk": 60_000,
  "2wk": 60_000,
  "1mo": 120_000,
  "3mo": 120_000,
  "6mo": 120_000,
  ytd: 120_000,
  "1y": 120_000,
  "2y": 15 * 60_000,
  "5y": 15 * 60_000,
  max: 60 * 60_000,
};
export const INDICATOR_POLL_MS = 60000;

// Price Predictor forecast horizon options, ordered shortest to longest. `value` is sent
// to the backend as the `horizon_days` query param (see backend/services/prediction_service.py::ALLOWED_HORIZONS).
export const FORECAST_HORIZONS = [
  { label: "1D", value: 1 },
  { label: "3D", value: 3 },
  { label: "7D", value: 7 },
  { label: "14D", value: 14 },
  { label: "30D", value: 30 },
] as const;

// Slower than CANDLE_POLL_MS - a daily-bar-derived forecast is also cached server-side for
// 5 minutes (forecast_cache_ttl_seconds), so polling faster would just re-fetch the same
// cached response.
export const FORECAST_POLL_MS = 5 * 60 * 1000;

export interface CurrencyMeta {
  code: string;
  label: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
];

// Currencies conventionally shown with no decimal places (e.g. JPY).
export const ZERO_DECIMAL_CURRENCIES = ["JPY"];

export const FX_POLL_MS = 5 * 60 * 1000;

export const AI_SUGGESTED_QUESTIONS = [
  "Why is this asset showing this risk level?",
  "What does this prediction mean?",
  "Explain these indicators in simple terms",
  "How reliable is this based on the backtest?",
  "Is the model confident or uncertain?",
  "What should I pay attention to next?",
] as const;
