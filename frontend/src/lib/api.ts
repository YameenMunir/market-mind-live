import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "@/lib/constants";
import { getDeviceId } from "@/lib/deviceId";
import type {
  AIAssetContext,
  Alert,
  AlertActionResponse,
  AlertCreateRequest,
  AlertListResponse,
  AnalystConsensus,
  ApiErrorPayload,
  AssetSearchResult,
  AssetType,
  BacktestRequest,
  BacktestResult,
  CandleSeries,
  ChatHistoryResponse,
  ChatRequest,
  ChatResponse,
  ChatStreamEvent,
  DeleteSessionResponse,
  FeedbackRequest,
  FxRates,
  GeminiKeyStatus,
  IndicatorSet,
  KnowledgeArticle,
  MarketStatus,
  NewSessionRequest,
  NewSessionResponse,
  NewsFeed,
  PredictionHistoryEntry,
  PredictionResult,
  PriceForecast,
  PriceQuote,
  RatingChangeFeed,
  RegenerateRequest,
  RiskAssessment,
  SessionDetailResponse,
  SessionListResponse,
  SummariseRequest,
  SummariseResponse,
  UserSettings,
} from "@/types";
import { ApiError } from "@/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // A request that never resolves (backend hung, connection silently dropped) would
  // otherwise leave a caller's isLoading state true forever - this bounds every call
  // to REQUEST_TIMEOUT_MS so a hang surfaces as a normal, retryable network_error
  // instead of an indefinite spinner.
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Device-Id": getDeviceId(), ...(init?.headers || {}) },
      cache: "no-store",
      signal: timeoutController.signal,
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    throw new ApiError({
      error_code: "network_error",
      message: isTimeout
        ? "The market data service took too long to respond. Retrying automatically."
        : "Could not reach the market data service. Check your connection and try again.",
    });
  } finally {
    clearTimeout(timeoutId);
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

export interface ChatStreamHandlers {
  onChunk: (text: string) => void;
  onDone: (event: Extract<ChatStreamEvent, { type: "done" }>) => void;
  onError: (error: ApiError) => void;
}

/** Streams an SSE chat endpoint (`/chat/stream` or `/chat/regenerate`) via `fetch` + a
 * `ReadableStream` reader (not `EventSource`, which can't send a POST body) and
 * hand-parses the Server-Sent Events framing - see backend/api/ai_insights.py's
 * `_sse_response` for the event shapes both endpoints share. Deliberately has no
 * overall timeout the way `request()` does: a stalled connection with no bytes at all
 * still resolves eventually via the browser's own TCP-level timeout, and capping total
 * stream *duration* would cut off a slow-but-real answer partway through, which a flat
 * timeout on a single JSON response never risked. Cancellation is `signal`'s job (see
 * useAIChat's `stopGenerating`), not a timer. */
async function streamSSE(
  path: string,
  body: ChatRequest | RegenerateRequest,
  handlers: ChatStreamHandlers,
  signal: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": getDeviceId() },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    handlers.onError(
      new ApiError({
        error_code: "network_error",
        message: "Could not reach the AI assistant. Check your connection and try again.",
      })
    );
    return;
  }

  if (!res.ok || !res.body) {
    let payload: ApiErrorPayload;
    try {
      payload = await res.json();
    } catch {
      payload = { error_code: "internal_error", message: `Request failed with status ${res.status}.` };
    }
    handlers.onError(new ApiError(payload));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line; only the "data:" line of each
      // event matters here (the backend never sends "event:"/"id:" lines).
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
        boundary = buffer.indexOf("\n\n");
        if (!dataLine) continue;
        const jsonStr = dataLine.slice(5).trim();
        if (!jsonStr) continue;

        let event: ChatStreamEvent;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (event.type === "chunk") handlers.onChunk(event.text);
        else if (event.type === "done") handlers.onDone(event);
        else if (event.type === "error") handlers.onError(new ApiError({ error_code: event.error_code, message: event.message }));
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    handlers.onError(
      new ApiError({ error_code: "network_error", message: "The connection to the AI assistant was interrupted." })
    );
  }
}

const streamAIChat = (body: ChatRequest, handlers: ChatStreamHandlers, signal: AbortSignal) =>
  streamSSE("/api/ai/insights/chat/stream", body, handlers, signal);

const streamRegenerate = (body: RegenerateRequest, handlers: ChatStreamHandlers, signal: AbortSignal) =>
  streamSSE("/api/ai/insights/chat/regenerate", body, handlers, signal);

export const api = {
  searchAssets: (query: string, assetType?: AssetType) => {
    const params = new URLSearchParams({ q: query });
    if (assetType) params.set("asset_type", assetType);
    return request<AssetSearchResult[]>(`/api/assets/search?${params.toString()}`);
  },
  getQuote: (symbol: string) => request<PriceQuote>(`/api/prices/${encodeURIComponent(symbol)}/quote`),
  // Fetches quotes for multiple symbols in one round trip (e.g. a watchlist) instead of
  // one request per symbol - a failed/unknown symbol resolves to `null` rather than
  // failing the whole batch.
  getQuotesBatch: (symbols: string[]) =>
    request<Record<string, PriceQuote | null>>(
      `/api/prices/batch/quotes?symbols=${encodeURIComponent(symbols.join(","))}`
    ),
  getCandles: (symbol: string, range: string) =>
    request<CandleSeries>(`/api/prices/${encodeURIComponent(symbol)}/candles?range=${encodeURIComponent(range)}`),
  getMarketStatus: (symbol: string) => request<MarketStatus>(`/api/market/status/${encodeURIComponent(symbol)}`),
  getIndicators: (symbol: string) => request<IndicatorSet>(`/api/indicators/${encodeURIComponent(symbol)}`),
  getPrediction: (symbol: string) => request<PredictionResult>(`/api/predictions/${encodeURIComponent(symbol)}`),
  getPredictionHistory: (symbol: string) =>
    request<PredictionHistoryEntry[]>(`/api/predictions/${encodeURIComponent(symbol)}/history`),
  getPriceForecast: (symbol: string, horizonDays: number) =>
    request<PriceForecast>(`/api/predictions/${encodeURIComponent(symbol)}/forecast?horizon_days=${horizonDays}`),
  getRisk: (symbol: string) => request<RiskAssessment>(`/api/risk/${encodeURIComponent(symbol)}`),
  runBacktest: (body: BacktestRequest) =>
    request<BacktestResult>(`/api/backtest`, { method: "POST", body: JSON.stringify(body) }),
  aiChat: (body: ChatRequest) =>
    request<ChatResponse>(`/api/ai/insights/chat`, { method: "POST", body: JSON.stringify(body) }),
  streamAIChat,
  streamRegenerate,
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
  getAnalystConsensus: (symbol: string) => request<AnalystConsensus>(`/api/analysts/${encodeURIComponent(symbol)}`),
  getRatingChanges: (symbol: string, count = 20) =>
    request<RatingChangeFeed>(`/api/analysts/${encodeURIComponent(symbol)}/rating-changes?count=${count}`),
  getNews: (symbol: string, count = 10) =>
    request<NewsFeed>(`/api/news/${encodeURIComponent(symbol)}?count=${count}`),
  getKnowledgeArticles: () => request<KnowledgeArticle[]>(`/api/knowledge/articles`),
  getUserSettings: () => request<UserSettings>(`/api/settings`),
  updateUserSettings: (body: UserSettings) =>
    request<UserSettings>(`/api/settings`, { method: "PUT", body: JSON.stringify(body) }),
  getGeminiKeyStatus: () => request<GeminiKeyStatus>(`/api/ai/gemini-key`),
  setGeminiKey: (apiKey: string) =>
    request<GeminiKeyStatus>(`/api/ai/gemini-key`, { method: "PUT", body: JSON.stringify({ api_key: apiKey }) }),
  deleteGeminiKey: () => request<GeminiKeyStatus>(`/api/ai/gemini-key`, { method: "DELETE" }),
};
