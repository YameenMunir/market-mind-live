"""Small in-repo knowledge base used to ground the AI assistant's explanations.

This is a lightweight, keyword-retrieval "RAG" layer - no vector store or embedding
API required. Each article documents how a specific piece of the app's analytics is
computed, so the assistant can explain methodology instead of inventing generic
financial commentary. Swap `retrieve()` for a real embedding-based search later
without changing the article format or the callers.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class KnowledgeArticle:
    id: str
    title: str
    keywords: tuple[str, ...]
    body: str


ARTICLES: tuple[KnowledgeArticle, ...] = (
    KnowledgeArticle(
        id="rsi",
        title="RSI (Relative Strength Index)",
        keywords=("rsi", "relative strength", "overbought", "oversold", "momentum"),
        body=(
            "RSI measures the speed and size of recent price moves on a 0-100 scale using a "
            "14-period lookback. Readings at or above 70 are traditionally considered "
            "overbought (momentum may be stretched and due for a pause or pullback); readings "
            "at or below 30 are considered oversold (selling may be stretched). Readings between "
            "30 and 70 are neutral. RSI is a momentum indicator, not a standalone buy/sell signal."
        ),
    ),
    KnowledgeArticle(
        id="macd",
        title="MACD (Moving Average Convergence Divergence)",
        keywords=("macd", "histogram", "signal line", "crossover", "momentum"),
        body=(
            "MACD compares a fast EMA(12) and slow EMA(26) of price. The difference is the MACD "
            "line; a 9-period EMA of that line is the signal line; the histogram is MACD line "
            "minus signal line. A positive histogram indicates bullish momentum (fast average "
            "above slow), a negative histogram indicates bearish momentum. Crossovers can lag "
            "price action since all inputs are moving averages."
        ),
    ),
    KnowledgeArticle(
        id="moving_averages",
        title="Moving Averages (SMA/EMA) and trend",
        keywords=("sma", "ema", "moving average", "trend", "golden cross", "death cross"),
        body=(
            "SMA-20/50/200 are simple moving averages over those windows; EMA-12/26 weight recent "
            "prices more heavily. Price above its longer-term average (e.g. SMA-200) generally "
            "reflects an established uptrend; price below reflects a downtrend. Short-term "
            "averages crossing above longer-term ones (e.g. SMA-20 above SMA-50) is a classic "
            "bullish trend signal, and the reverse is bearish - these are lagging indicators."
        ),
    ),
    KnowledgeArticle(
        id="bollinger",
        title="Bollinger Bands",
        keywords=("bollinger", "bands", "volatility", "squeeze", "band"),
        body=(
            "Bollinger Bands plot a 20-period SMA (middle band) with upper/lower bands two "
            "standard deviations away. Price near the upper band can indicate short-term "
            "overextension to the upside; price near the lower band, overextension to the "
            "downside. Narrow bands indicate low volatility (often precedes a bigger move); wide "
            "bands indicate high volatility."
        ),
    ),
    KnowledgeArticle(
        id="atr",
        title="ATR (Average True Range) and support/resistance",
        keywords=("atr", "average true range", "support", "resistance", "target price"),
        body=(
            "ATR-14 measures average daily trading range (volatility), used here to size an "
            "indicative target price (roughly 1.5x ATR from the current price in the predicted "
            "direction) - it is not a guaranteed price target. Support/resistance levels are "
            "detected as recent local price pivots (swing highs/lows), not hard floors or ceilings."
        ),
    ),
    KnowledgeArticle(
        id="prediction_methodology",
        title="How the prediction model works",
        keywords=("prediction", "forecast", "signal", "confidence", "model", "bullish", "bearish"),
        body=(
            "The prediction engine is a transparent, rule-based scoring model (not a black-box "
            "neural network): it scores trend (SMA-20 vs SMA-50, price vs SMA-200), momentum "
            "(RSI, MACD histogram), volatility positioning (Bollinger Band location), and "
            "proximity to recent support/resistance levels (relative to ATR), then combines them "
            "into a single score. Positive scores lean bullish, negative lean "
            "bearish, and scores near zero are neutral. Confidence reflects how strongly the "
            "underlying indicators agree with each other, not a statistical probability of a "
            "specific price outcome - it should be read as 'how aligned are the signals', not "
            "'chance of being right'."
        ),
    ),
    KnowledgeArticle(
        id="risk_methodology",
        title="How the risk score is calculated",
        keywords=("risk", "risk score", "volatility", "drawdown", "risk level"),
        body=(
            "Risk is derived from annualized volatility of daily returns and the maximum observed "
            "drawdown over the lookback window. Volatility bands are roughly: under 15% = low "
            "risk, 15-35% = medium, 35-70% = high, above 70% = extreme (these bands are "
            "calibrated loosely against typical equities ~15-30%, major FX pairs ~7-12%, and "
            "crypto ~60-120%). The risk score (0-100) is a continuous version of that same "
            "banding, not a probability of loss."
        ),
    ),
    KnowledgeArticle(
        id="backtesting_methodology",
        title="How backtesting results should be read",
        keywords=("backtest", "win rate", "sharpe", "drawdown", "equity curve", "strategy"),
        body=(
            "The backtest engine simulates a single trend-following strategy (long when SMA-20 is "
            "above SMA-50 and the MACD histogram is positive, flat otherwise) over historical "
            "daily bars - it does not represent every possible strategy for the asset, and past "
            "performance on historical data does not guarantee future results. Win rate is the "
            "share of closed trades with a positive return; max drawdown is the worst peak-to-"
            "trough equity decline during the run; total trades matters for statistical "
            "significance - a high win rate from only 2-3 trades is far less reliable than one "
            "from 30+."
        ),
    ),
    KnowledgeArticle(
        id="glossary",
        title="Trading terms glossary",
        keywords=("beginner", "explain", "what is", "glossary", "term", "mean"),
        body=(
            "Bullish = expecting price to rise. Bearish = expecting price to fall. Neutral/hold = "
            "no strong directional edge either way. Volatility = how much and how fast price "
            "moves. Drawdown = a decline from a recent peak. Confidence = how strongly a model's "
            "internal signals agree, not a guarantee. Liquidity, slippage, and spread all affect "
            "real-world execution but are not modeled here."
        ),
    ),
)


def retrieve(query: str, top_k: int = 3) -> list[KnowledgeArticle]:
    """Keyword-overlap retrieval over the local knowledge base.

    Deliberately simple (no embeddings/vector DB) so the assistant stays grounded in
    documented methodology without adding external dependencies or network calls.
    """
    q = query.lower()
    scored: list[tuple[int, KnowledgeArticle]] = []
    for article in ARTICLES:
        score = sum(1 for kw in article.keywords if kw in q)
        if score > 0:
            scored.append((score, article))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [article for _, article in scored[:top_k]]
