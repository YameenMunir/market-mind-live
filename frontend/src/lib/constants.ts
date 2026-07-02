import type { AssetType } from "@/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  forex: "Forex",
  commodity: "Commodities",
  index: "Indices",
};

export const CANDLE_INTERVALS = [
  { label: "1D", value: "1d" },
  { label: "1H", value: "1h" },
  { label: "15M", value: "15m" },
  { label: "5M", value: "5m" },
  { label: "1WK", value: "1wk" },
] as const;

export const DEFAULT_SYMBOL = "AAPL";
export const QUOTE_POLL_FALLBACK_MS = 8000;
export const CANDLE_POLL_MS = 30000;
export const INDICATOR_POLL_MS = 60000;

export const AI_SUGGESTED_QUESTIONS = [
  "Why is this asset showing this risk level?",
  "What does this prediction mean?",
  "Explain these indicators in simple terms",
  "How reliable is this based on the backtest?",
  "Is the model confident or uncertain?",
  "What should I pay attention to next?",
] as const;
