import { API_BASE_URL } from "@/lib/constants";
import type {
  ApiErrorPayload,
  AssetSearchResult,
  AssetType,
  BacktestRequest,
  BacktestResult,
  CandleSeries,
  IndicatorSet,
  MarketStatus,
  PredictionHistoryEntry,
  PredictionResult,
  PriceQuote,
  RiskAssessment,
} from "@/types";
import { ApiError } from "@/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError({
      error_code: "network_error",
      message: "Could not reach the market data service. Check your connection and try again.",
    });
  }

  if (!res.ok) {
    let payload: ApiErrorPayload;
    try {
      payload = await res.json();
    } catch {
      payload = { error_code: "internal_error", message: `Request failed with status ${res.status}.` };
    }
    throw new ApiError(payload);
  }

  return res.json() as Promise<T>;
}

export const api = {
  searchAssets: (query: string, assetType?: AssetType) => {
    const params = new URLSearchParams({ q: query });
    if (assetType) params.set("asset_type", assetType);
    return request<AssetSearchResult[]>(`/api/assets/search?${params.toString()}`);
  },
  getQuote: (symbol: string) => request<PriceQuote>(`/api/prices/${encodeURIComponent(symbol)}/quote`),
  getCandles: (symbol: string, interval: string) =>
    request<CandleSeries>(`/api/prices/${encodeURIComponent(symbol)}/candles?interval=${interval}`),
  getMarketStatus: (symbol: string) => request<MarketStatus>(`/api/market/status/${encodeURIComponent(symbol)}`),
  getIndicators: (symbol: string) => request<IndicatorSet>(`/api/indicators/${encodeURIComponent(symbol)}`),
  getPrediction: (symbol: string) => request<PredictionResult>(`/api/predictions/${encodeURIComponent(symbol)}`),
  getPredictionHistory: (symbol: string) =>
    request<PredictionHistoryEntry[]>(`/api/predictions/${encodeURIComponent(symbol)}/history`),
  getRisk: (symbol: string) => request<RiskAssessment>(`/api/risk/${encodeURIComponent(symbol)}`),
  runBacktest: (body: BacktestRequest) =>
    request<BacktestResult>(`/api/backtest`, { method: "POST", body: JSON.stringify(body) }),
};
