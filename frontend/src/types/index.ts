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
