import { API_BASE_URL } from "@/lib/constants";
import type {
  AIAssetContext,
  Alert,
  AlertActionResponse,
  AlertCreateRequest,
  AlertListResponse,
  ApiErrorPayload,
  AssetSearchResult,
  AssetType,
  BacktestRequest,
  BacktestResult,
  CandleSeries,
  ChatHistoryResponse,
  ChatRequest,
  ChatResponse,
  DeleteSessionResponse,
  FeedbackRequest,
  FxRates,
  IndicatorSet,
  MarketStatus,
  NewSessionRequest,
  NewSessionResponse,
  PredictionHistoryEntry,
  PredictionResult,
  PriceQuote,
  RiskAssessment,
  SessionDetailResponse,
  SessionListResponse,
  SummariseRequest,
  SummariseResponse,
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
  aiChat: (body: ChatRequest) =>
    request<ChatResponse>(`/api/ai/insights/chat`, { method: "POST", body: JSON.stringify(body) }),
  getAIContext: (asset: string) =>
    request<AIAssetContext>(`/api/ai/insights/context/${encodeURIComponent(asset)}`),
  sendAIFeedback: (body: FeedbackRequest) =>
    request<{ status: string }>(`/api/ai/insights/feedback`, { method: "POST", body: JSON.stringify(body) }),
  getAIHistory: (sessionId: string) =>
    request<ChatHistoryResponse>(`/api/ai/insights/history?session_id=${encodeURIComponent(sessionId)}`),
  summariseAI: (body: SummariseRequest) =>
    request<SummariseResponse>(`/api/ai/insights/summarise`, { method: "POST", body: JSON.stringify(body) }),
  newAISession: (body: NewSessionRequest) =>
    request<NewSessionResponse>(`/api/ai/insights/new-session`, { method: "POST", body: JSON.stringify(body) }),
  getAISessions: () => request<SessionListResponse>(`/api/ai/insights/sessions`),
  getAISessionDetail: (sessionId: string) =>
    request<SessionDetailResponse>(`/api/ai/insights/sessions/${encodeURIComponent(sessionId)}`),
  deleteAISession: (sessionId: string) =>
    request<DeleteSessionResponse>(`/api/ai/insights/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  createAlert: (body: AlertCreateRequest) => request<Alert>(`/api/alerts`, { method: "POST", body: JSON.stringify(body) }),
  getAlerts: (symbol?: string) =>
    request<AlertListResponse>(`/api/alerts${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ""}`),
  deleteAlert: (alertId: string) =>
    request<AlertActionResponse>(`/api/alerts/${encodeURIComponent(alertId)}`, { method: "DELETE" }),
  dismissAlert: (alertId: string) =>
    request<AlertActionResponse>(`/api/alerts/${encodeURIComponent(alertId)}/dismiss`, { method: "POST" }),
  getFxRates: () => request<FxRates>(`/api/fx/rates`),
};
