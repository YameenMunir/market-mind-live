import type {
  AIAssetContext,
  AIBacktestContext,
  AIPredictionContext,
  AIRiskContext,
  AITechnicalContext,
  BacktestResult,
  IndicatorSet,
  MarketStatus,
  PredictionHistoryEntry,
  PredictionResult,
  PriceQuote,
  RiskAssessment,
} from "@/types";

function signalFromPrediction(prediction: PredictionResult | null): AIPredictionContext["signal"] {
  if (!prediction) return "hold";
  if (prediction.direction === "bullish") return prediction.confidence >= 60 ? "buy" : "hold";
  if (prediction.direction === "bearish") return prediction.confidence >= 60 ? "sell" : "hold";
  return "hold";
}

function bollingerPosition(price: number | null, indicators: IndicatorSet | null): string | null {
  const upper = indicators?.bollinger_bands.upper;
  const lower = indicators?.bollinger_bands.lower;
  if (price == null || upper == null || lower == null || upper <= lower) return null;
  const position = (price - lower) / (upper - lower);
  if (position >= 0.85) return "near the upper band";
  if (position <= 0.15) return "near the lower band";
  return "mid-range between the bands";
}

function movingAverageTrend(price: number | null, indicators: IndicatorSet | null): string | null {
  const sma50 = indicators?.moving_averages.sma_50 ?? null;
  const sma200 = indicators?.moving_averages.sma_200 ?? null;
  if (price == null) return null;
  if (sma50 != null && sma200 != null) {
    if (price > sma50 && price > sma200) return "above both the 50- and 200-period averages (uptrend)";
    if (price < sma50 && price < sma200) return "below both the 50- and 200-period averages (downtrend)";
    return "mixed versus its 50- and 200-period averages";
  }
  if (sma50 != null) return price > sma50 ? "above the 50-period average" : "below the 50-period average";
  return null;
}

interface BuildContextInput {
  asset: string;
  assetName?: string | null;
  quote: PriceQuote | null;
  marketStatus: MarketStatus | null;
  indicators: IndicatorSet | null;
  prediction: PredictionResult | null;
  risk: RiskAssessment | null;
  backtest?: BacktestResult | null;
  predictionHistory?: PredictionHistoryEntry[] | null;
}

/** Mirrors backend/services/context_builder.py so the assistant is grounded in
 * exactly what's currently rendered on screen, rather than a value re-fetched
 * server-side that might have moved on since the last render. */
export function buildAssetContext(input: BuildContextInput): AIAssetContext {
  const missing: string[] = [];
  if (!input.quote) missing.push("Live quote is not loaded yet in this view.");
  if (!input.indicators || !input.prediction || !input.risk) {
    missing.push("Technical indicators, prediction, or risk data is still loading.");
  }

  const price = input.quote?.price ?? null;

  const technical: AITechnicalContext | null = input.indicators
    ? {
        rsi: input.indicators.rsi_14,
        macd_trend:
          input.indicators.macd.histogram == null ? null : input.indicators.macd.histogram > 0 ? "bullish" : "bearish",
        moving_average_trend: movingAverageTrend(price, input.indicators),
        volatility: input.risk?.risk_level ?? null,
        bollinger_position: bollingerPosition(price, input.indicators),
      }
    : null;

  const predictionCtx: AIPredictionContext | null = input.prediction
    ? {
        signal: signalFromPrediction(input.prediction),
        forecast_direction: input.prediction.direction,
        confidence: input.prediction.confidence,
        model_name: "rule-based technical ensemble",
        horizon: input.prediction.horizon,
        target_price: input.prediction.target_price,
        explanation: input.prediction.plain_english_explanation,
        reasoning: input.prediction.reasoning,
      }
    : null;

  const riskCtx: AIRiskContext | null = input.risk
    ? {
        level: input.risk.risk_level,
        score: input.risk.risk_score,
        volatility_annualized_pct: input.risk.volatility_annualized_pct,
        max_drawdown_pct: input.risk.max_drawdown_pct,
        reasons: input.risk.factors,
      }
    : null;

  const backtestCtx: AIBacktestContext | null = input.backtest
    ? {
        available: true,
        win_rate_pct: input.backtest.win_rate_pct,
        max_drawdown_pct: input.backtest.max_drawdown_pct,
        sharpe_ratio: null,
        total_return_pct: input.backtest.total_return_pct,
        total_trades: input.backtest.total_trades,
        lookback_days: input.backtest.lookback_days,
        note: null,
      }
    : {
        available: false,
        win_rate_pct: null,
        max_drawdown_pct: null,
        sharpe_ratio: null,
        total_return_pct: null,
        total_trades: null,
        lookback_days: null,
        note: "No backtest has been run for this asset in the current session yet.",
      };

  return {
    asset: input.asset,
    asset_name: input.assetName ?? null,
    latest_price: price,
    price_change: input.quote?.change ?? null,
    price_change_percent: input.quote?.change_percent ?? null,
    timeframe: "1D",
    market_status: input.marketStatus?.session ?? null,
    is_market_open: input.marketStatus?.is_open ?? null,
    last_updated: new Date().toISOString(),
    data_is_delayed: input.quote?.is_delayed ?? true,
    technical_indicators: technical,
    prediction: predictionCtx,
    risk: riskCtx,
    backtesting: backtestCtx,
    prediction_history_count: input.predictionHistory?.length ?? 0,
    missing_data: missing,
  };
}
