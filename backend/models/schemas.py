from __future__ import annotations

from enum import Enum

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
    interval: str
    candles: list[Candle]


class MarketSession(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    PRE_MARKET = "pre_market"
    AFTER_HOURS = "after_hours"


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


class ErrorCode(str, Enum):
    MISSING_API_KEY = "missing_api_key"
    INVALID_SYMBOL = "invalid_symbol"
    RATE_LIMITED = "rate_limited"
    MARKET_CLOSED = "market_closed"
    NETWORK_ERROR = "network_error"
    DATA_DELAYED = "data_delayed"
    UNSUPPORTED_ASSET_TYPE = "unsupported_asset_type"
    INTERNAL_ERROR = "internal_error"


class ErrorResponse(BaseModel):
    error_code: ErrorCode
    message: str
    detail: str | None = None
