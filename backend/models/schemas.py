from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class AssetType(str, Enum):
    STOCK = "stock"
    ETF = "etf"
    CRYPTO = "crypto"
    FOREX = "forex"
    COMMODITY = "commodity"
    INDEX = "index"


class AssetSearchResult(BaseModel):
    symbol: str
    name: str
    asset_type: AssetType
    exchange: str


class MarketSession(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    PRE_MARKET = "pre_market"
    AFTER_HOURS = "after_hours"


class PriceQuote(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    previous_close: float
    day_high: float | None = None
    day_low: float | None = None
    volume: float | None = None
    currency: str = "USD"
    as_of: str
    is_delayed: bool = False


class Candle(BaseModel):
    time: int  # unix seconds
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None


class CandleSeries(BaseModel):
    symbol: str
    # The requested chart filter (e.g. "1d", "5d", ..., "max") - see
    # services/price_service.py: RANGE_CONFIG for the full set and what each maps to.
    range: str
    # The actual bar/candle resolution used to satisfy that range (e.g. "5m", "1d", "1wk").
    interval: str
    currency: str = "USD"
    market_status: MarketSession
    is_market_open: bool
    # UTC ISO timestamp of when this series was fetched from the provider (not merely
    # serialized) - unchanged across cache hits, so it reflects true data freshness.
    last_updated: str
    candles: list[Candle]


class FxRates(BaseModel):
    base: str = "USD"
    # USD value of 1 unit of each currency (e.g. rates["GBP"] == 1.27 means 1 GBP = 1.27 USD).
    # rates["USD"] is always 1.0.
    rates: dict[str, float]
    as_of: str


class MarketStatus(BaseModel):
    symbol: str
    asset_type: AssetType
    session: MarketSession
    is_open: bool
    message: str
    next_change_utc: str | None = None
    timezone: str = "America/New_York"


class MovingAverages(BaseModel):
    sma_20: float | None = None
    sma_50: float | None = None
    sma_200: float | None = None
    ema_12: float | None = None
    ema_26: float | None = None


class MACD(BaseModel):
    macd_line: float | None = None
    signal_line: float | None = None
    histogram: float | None = None


class BollingerBands(BaseModel):
    upper: float | None = None
    middle: float | None = None
    lower: float | None = None


class SupportResistance(BaseModel):
    support: list[float] = Field(default_factory=list)
    resistance: list[float] = Field(default_factory=list)


class IndicatorSet(BaseModel):
    symbol: str
    rsi_14: float | None = None
    moving_averages: MovingAverages
    macd: MACD
    bollinger_bands: BollingerBands
    support_resistance: SupportResistance
    atr_14: float | None = None


class PredictionDirection(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class PredictionResult(BaseModel):
    symbol: str
    direction: PredictionDirection
    confidence: float = Field(ge=0, le=100)
    target_price: float | None = None
    horizon: str = "1-3 sessions"
    reasoning: list[str]
    beginner_summary: str
    plain_english_explanation: str
    generated_at: str


class ForecastPoint(BaseModel):
    date: str
    predicted_price: float
    lower_bound: float
    upper_bound: float
    confidence: float = Field(ge=0, le=100)


class PriceForecast(BaseModel):
    symbol: str
    horizon_days: int
    generated_at: str
    last_actual_price: float
    last_actual_date: str
    is_market_open: bool
    data_is_delayed: bool
    methodology: str
    disclaimer: str
    points: list[ForecastPoint]


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


class RiskAssessment(BaseModel):
    symbol: str
    risk_level: RiskLevel
    risk_score: float = Field(ge=0, le=100)
    volatility_annualized_pct: float
    max_drawdown_pct: float | None = None
    factors: list[str]


class AnalystRating(str, Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"
    NOT_COVERED = "not_covered"


class AnalystConsensus(BaseModel):
    symbol: str
    rating: AnalystRating
    total_analysts: int = 0
    strong_buy: int = 0
    buy: int = 0
    hold: int = 0
    sell: int = 0
    strong_sell: int = 0
    price_target_low: float | None = None
    price_target_high: float | None = None
    price_target_mean: float | None = None
    price_target_median: float | None = None
    currency: str = "USD"
    as_of: str
    # True when this is the last successfully-fetched value being served during a
    # provider outage/rate-limit window rather than a fresh fetch - `as_of` still
    # reflects when it was *actually* fetched, so the frontend can show "last updated
    # X ago" honestly instead of implying live data.
    is_stale: bool = False


class RatingChangeAction(str, Enum):
    UPGRADE = "upgrade"
    DOWNGRADE = "downgrade"
    INITIATED = "initiated"
    REITERATED = "reiterated"
    # Yahoo's raw action code didn't match a known one - from_grade/to_grade are still
    # populated so the change itself is still visible even when this label isn't.
    OTHER = "other"


class RatingChange(BaseModel):
    firm: str
    action: RatingChangeAction
    from_grade: str | None = None
    to_grade: str | None = None
    graded_at: str


class RatingChangeFeed(BaseModel):
    symbol: str
    changes: list[RatingChange] = Field(default_factory=list)
    as_of: str
    # See AnalystConsensus.is_stale - same meaning.
    is_stale: bool = False


class NewsArticle(BaseModel):
    title: str
    summary: str | None = None
    url: str
    publisher: str | None = None
    published_at: str | None = None
    thumbnail_url: str | None = None


class NewsFeed(BaseModel):
    symbol: str
    articles: list[NewsArticle] = Field(default_factory=list)
    as_of: str
    # See AnalystConsensus.is_stale - same meaning: a last-known-good value served
    # during a provider outage/rate-limit window rather than a fresh fetch.
    is_stale: bool = False


class PredictionHistoryEntry(BaseModel):
    symbol: str
    direction: PredictionDirection
    confidence: float
    price_at_prediction: float
    generated_at: str


class BacktestRequest(BaseModel):
    symbol: str
    lookback_days: int = Field(default=180, ge=30, le=1825)
    initial_capital: float = Field(default=10000, gt=0)


class BacktestTrade(BaseModel):
    entry_time: int
    exit_time: int
    entry_price: float
    exit_price: float
    direction: PredictionDirection
    return_pct: float


class EquityPoint(BaseModel):
    time: int
    equity: float


class BacktestResult(BaseModel):
    symbol: str
    lookback_days: int
    initial_capital: float
    final_equity: float
    total_return_pct: float
    win_rate_pct: float
    max_drawdown_pct: float
    total_trades: int
    equity_curve: list[EquityPoint]
    trades: list[BacktestTrade]
    currency: str = "USD"


class ErrorCode(str, Enum):
    MISSING_API_KEY = "missing_api_key"
    INVALID_SYMBOL = "invalid_symbol"
    RATE_LIMITED = "rate_limited"
    MARKET_CLOSED = "market_closed"
    NETWORK_ERROR = "network_error"
    DATA_DELAYED = "data_delayed"
    UNSUPPORTED_ASSET_TYPE = "unsupported_asset_type"
    AI_PROVIDER_ERROR = "ai_provider_error"
    VALIDATION_ERROR = "validation_error"
    INTERNAL_ERROR = "internal_error"
    INSUFFICIENT_HISTORY = "insufficient_history"


class ErrorResponse(BaseModel):
    error_code: ErrorCode
    message: str
    detail: str | None = None


# ---------------------------------------------------------------------------
# AI Insights Assistant
# ---------------------------------------------------------------------------


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    message_id: str
    role: ChatRole
    content: str
    created_at: str


class AITechnicalContext(BaseModel):
    rsi: float | None = None
    macd_trend: str | None = None  # "bullish" | "bearish" | "neutral"
    moving_average_trend: str | None = None
    volatility: str | None = None  # "low" | "medium" | "high" | "extreme"
    bollinger_position: str | None = None


class AIPredictionContext(BaseModel):
    signal: str  # "buy" | "sell" | "hold"
    forecast_direction: PredictionDirection
    confidence: float
    model_name: str = "rule-based technical ensemble"
    horizon: str | None = None
    target_price: float | None = None
    explanation: str
    reasoning: list[str] = Field(default_factory=list)


class AIRiskContext(BaseModel):
    level: RiskLevel
    score: float
    volatility_annualized_pct: float
    max_drawdown_pct: float | None = None
    reasons: list[str] = Field(default_factory=list)


class AIBacktestContext(BaseModel):
    available: bool = False
    win_rate_pct: float | None = None
    max_drawdown_pct: float | None = None
    sharpe_ratio: float | None = None
    total_return_pct: float | None = None
    total_trades: int | None = None
    lookback_days: int | None = None
    note: str | None = None


class AINewsItem(BaseModel):
    # Deliberately lean compared to NewsArticle (no url/thumbnail) - this gets dumped
    # straight into the Gemini prompt, and the assistant's chat UI doesn't render
    # markdown links, so a raw URL there is prompt bloat with no payoff.
    title: str
    publisher: str | None = None
    published_at: str | None = None
    summary: str | None = None


class AIAssetContext(BaseModel):
    asset: str
    asset_name: str | None = None
    latest_price: float | None = None
    price_change: float | None = None
    price_change_percent: float | None = None
    timeframe: str = "1D"
    market_status: str | None = None
    is_market_open: bool | None = None
    last_updated: str | None = None
    data_is_delayed: bool = True
    technical_indicators: AITechnicalContext | None = None
    prediction: AIPredictionContext | None = None
    risk: AIRiskContext | None = None
    backtesting: AIBacktestContext | None = None
    news: list[AINewsItem] = Field(default_factory=list)
    # Reuses RatingChange as-is (unlike AINewsItem vs NewsArticle) - every field on it
    # (firm/action/from_grade/to_grade/graded_at) is already lean and useful grounding,
    # nothing to trim before it goes into the Gemini prompt.
    rating_changes: list[RatingChange] = Field(default_factory=list)
    prediction_history_count: int = 0
    missing_data: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)
    message: str = Field(min_length=1, max_length=2000)
    asset: str
    client_context: AIAssetContext | None = None


class ChatResponse(BaseModel):
    session_id: str
    message_id: str
    reply: str
    provider: str  # "gemini" | "mock" | "mock-fallback"
    context_used: AIAssetContext
    disclaimer: str
    created_at: str


class FeedbackRating(str, Enum):
    UP = "up"
    DOWN = "down"


class FeedbackRequest(BaseModel):
    session_id: str
    message_id: str
    rating: FeedbackRating
    comment: str | None = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    status: str = "recorded"


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: list[ChatMessage]


class SummariseRequest(BaseModel):
    asset: str
    client_context: AIAssetContext | None = None


class SummariseResponse(BaseModel):
    asset: str
    summary: str
    provider: str
    disclaimer: str


class ChatSessionSummary(BaseModel):
    session_id: str
    asset: str
    asset_name: str | None = None
    created_at: str
    updated_at: str
    last_message_preview: str
    signal: str | None = None  # "buy" | "sell" | "hold"
    risk_level: RiskLevel | None = None
    message_count: int


class NewSessionRequest(BaseModel):
    asset: str
    client_context: AIAssetContext | None = None


class NewSessionResponse(BaseModel):
    session_id: str
    asset: str
    welcome_message: ChatMessage
    disclaimer: str


class SessionListResponse(BaseModel):
    sessions: list[ChatSessionSummary]


class SessionDetailResponse(BaseModel):
    session_id: str
    asset: str | None = None
    asset_name: str | None = None
    messages: list[ChatMessage]


class DeleteSessionResponse(BaseModel):
    status: str = "deleted"


# ---------------------------------------------------------------------------
# Price / signal alerts
# ---------------------------------------------------------------------------


class AlertCondition(str, Enum):
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    RSI_OVERBOUGHT = "rsi_overbought"
    RSI_OVERSOLD = "rsi_oversold"
    SIGNAL_CHANGE = "signal_change"
    RISK_LEVEL_CHANGE = "risk_level_change"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISMISSED = "dismissed"


class AlertCreateRequest(BaseModel):
    symbol: str
    condition: AlertCondition
    # Required for price_above/price_below; overrides the 70/30 default for
    # rsi_overbought/rsi_oversold; ignored for signal_change/risk_level_change.
    threshold: float | None = None
    note: str | None = Field(default=None, max_length=280)


class Alert(BaseModel):
    id: str
    symbol: str
    asset_name: str | None = None
    condition: AlertCondition
    threshold: float | None = None
    # Signal/risk level captured at creation time - signal_change/risk_level_change
    # fire when the live value diverges from this baseline, not a fixed threshold.
    baseline_value: str | None = None
    note: str | None = None
    status: AlertStatus
    created_at: str
    triggered_at: str | None = None
    triggered_message: str | None = None


class AlertListResponse(BaseModel):
    alerts: list[Alert]


class AlertActionResponse(BaseModel):
    status: str


class GeminiKeyStatus(BaseModel):
    """Never carries the decrypted key - only enough for the UI to show whether one is
    configured and a masked hint (e.g. '••••••••f8a2')."""

    has_key: bool
    masked_key: str | None = None
    updated_at: str | None = None


class GeminiKeyUpdateRequest(BaseModel):
    api_key: str = Field(min_length=1, max_length=512)


class KnowledgeArticle(BaseModel):
    """A static methodology explanation from services/knowledge_base.py, exposed for
    dashboard tooltips as well as the AI chat assistant's system prompt. Omits the
    article's `keywords` - that's an internal retrieval-scoring detail callers don't need."""

    id: str
    title: str
    body: str


class UserSettings(BaseModel):
    """Device-scoped dashboard preferences (see db/models.py: UserSettingsRecord).
    "simple" collapses the dashboard to price/prediction/chart/beginner-summary only;
    "advanced" (the default) shows everything, unchanged from before this setting existed."""

    experience_mode: Literal["simple", "advanced"] = "advanced"
