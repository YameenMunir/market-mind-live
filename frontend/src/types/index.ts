export type AssetType = "stock" | "etf" | "crypto" | "forex" | "commodity" | "index";

export interface AssetSearchResult {
  symbol: string;
  name: string;
  asset_type: AssetType;
  exchange: string;
}

export interface PriceQuote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  previous_close: number;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  currency: string;
  as_of: string;
  is_delayed: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface CandleSeries {
  symbol: string;
  interval: string;
  candles: Candle[];
}

export type MarketSession = "open" | "closed" | "pre_market" | "after_hours";

export interface MarketStatus {
  symbol: string;
  asset_type: AssetType;
  session: MarketSession;
  is_open: boolean;
  message: string;
  next_change_utc: string | null;
  timezone: string;
}

export interface MovingAverages {
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  ema_12: number | null;
  ema_26: number | null;
}

export interface MACD {
  macd_line: number | null;
  signal_line: number | null;
  histogram: number | null;
}

export interface BollingerBands {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface SupportResistance {
  support: number[];
  resistance: number[];
}

export interface IndicatorSet {
  symbol: string;
  rsi_14: number | null;
  moving_averages: MovingAverages;
  macd: MACD;
  bollinger_bands: BollingerBands;
  support_resistance: SupportResistance;
  atr_14: number | null;
}

export type PredictionDirection = "bullish" | "bearish" | "neutral";

export interface PredictionResult {
  symbol: string;
  direction: PredictionDirection;
  confidence: number;
  target_price: number | null;
  horizon: string;
  reasoning: string[];
  beginner_summary: string;
  plain_english_explanation: string;
  generated_at: string;
}

export type RiskLevel = "low" | "medium" | "high" | "extreme";

export interface RiskAssessment {
  symbol: string;
  risk_level: RiskLevel;
  risk_score: number;
  volatility_annualized_pct: number;
  max_drawdown_pct: number | null;
  factors: string[];
}

export interface PredictionHistoryEntry {
  symbol: string;
  direction: PredictionDirection;
  confidence: number;
  price_at_prediction: number;
  generated_at: string;
}

export interface BacktestRequest {
  symbol: string;
  lookback_days: number;
  initial_capital: number;
}

export interface BacktestTrade {
  entry_time: number;
  exit_time: number;
  entry_price: number;
  exit_price: number;
  direction: PredictionDirection;
  return_pct: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export interface BacktestResult {
  symbol: string;
  lookback_days: number;
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  win_rate_pct: number;
  max_drawdown_pct: number;
  total_trades: number;
  equity_curve: EquityPoint[];
  trades: BacktestTrade[];
}

export type ErrorCode =
  | "missing_api_key"
  | "invalid_symbol"
  | "rate_limited"
  | "market_closed"
  | "network_error"
  | "data_delayed"
  | "unsupported_asset_type"
  | "ai_provider_error"
  | "internal_error";

export interface ApiErrorPayload {
  error_code: ErrorCode;
  message: string;
  detail?: string | null;
}

export class ApiError extends Error {
  errorCode: ErrorCode;
  detail?: string | null;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.errorCode = payload.error_code;
    this.detail = payload.detail;
  }
}

// ---------------------------------------------------------------------------
// AI Insights Assistant
// ---------------------------------------------------------------------------

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  message_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface AITechnicalContext {
  rsi: number | null;
  macd_trend: string | null;
  moving_average_trend: string | null;
  volatility: string | null;
  bollinger_position: string | null;
}

export interface AIPredictionContext {
  signal: "buy" | "sell" | "hold";
  forecast_direction: PredictionDirection;
  confidence: number;
  model_name: string;
  horizon: string | null;
  target_price: number | null;
  explanation: string;
  reasoning: string[];
}

export interface AIRiskContext {
  level: RiskLevel;
  score: number;
  volatility_annualized_pct: number;
  max_drawdown_pct: number | null;
  reasons: string[];
}

export interface AIBacktestContext {
  available: boolean;
  win_rate_pct: number | null;
  max_drawdown_pct: number | null;
  sharpe_ratio: number | null;
  total_return_pct: number | null;
  total_trades: number | null;
  lookback_days: number | null;
  note: string | null;
}

export interface AIAssetContext {
  asset: string;
  asset_name: string | null;
  latest_price: number | null;
  price_change: number | null;
  price_change_percent: number | null;
  timeframe: string;
  market_status: string | null;
  is_market_open: boolean | null;
  last_updated: string | null;
  data_is_delayed: boolean;
  technical_indicators: AITechnicalContext | null;
  prediction: AIPredictionContext | null;
  risk: AIRiskContext | null;
  backtesting: AIBacktestContext | null;
  prediction_history_count: number;
  missing_data: string[];
}

export interface ChatRequest {
  session_id: string;
  message: string;
  asset: string;
  client_context?: AIAssetContext | null;
}

export interface ChatResponse {
  session_id: string;
  message_id: string;
  reply: string;
  provider: "gemini" | "mock" | "mock-fallback";
  context_used: AIAssetContext;
  disclaimer: string;
  created_at: string;
}

export type FeedbackRating = "up" | "down";

export interface FeedbackRequest {
  session_id: string;
  message_id: string;
  rating: FeedbackRating;
  comment?: string | null;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatMessage[];
}

export interface SummariseRequest {
  asset: string;
  client_context?: AIAssetContext | null;
}

export interface SummariseResponse {
  asset: string;
  summary: string;
  provider: "gemini" | "mock" | "mock-fallback";
  disclaimer: string;
}
