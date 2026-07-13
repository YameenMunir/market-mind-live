"""Modular and scalable reasoning engine for the AI Insights Assistant.
Enables strategy-based intent classification, portfolio history checks,
and guidelines formatting.
"""

from __future__ import annotations

import re
from typing import List
from models.schemas import ChatMessage, ChatRole

class IntentStrategy:
    """Defines an intent classification strategy with keywords and custom PM guidelines."""
    def __init__(self, name: str, keywords: List[str], guideline: str):
        self.name = name
        self.keywords = keywords
        self.guideline = guideline

    def matches(self, message: str) -> bool:
        m = message.lower()
        return any(k in m for k in self.keywords)


class ReasoningEngine:
    def __init__(self):
        # Register standard intent strategies
        self.strategies = [
            IntentStrategy(
                "BUY",
                ["buy more", "average down", "buy at", "should i buy", "entry point", "good entry", "good price to buy", "buy now"],
                "The user is asking about buying or entering a position. Focus on entry quality, logical support levels, pullback zones, confirmation indicators, and risk/reward ratios."
            ),
            IntentStrategy(
                "SELL",
                ["sell", "take profit", "exit", "stop loss", "get out", "cut loss"],
                "The user is asking about selling or exiting a position. Focus on protecting gains, identifying signs of trend exhaustion/weakness, key support breakdown points, and trailing stops."
            ),
            IntentStrategy(
                "HOLD",
                ["hold", "keep", "stay in"],
                "The user is asking about holding their current shares. Focus on trend strength, position rebalancing levels, and overall portfolio allocation considerations."
            ),
            IntentStrategy(
                "RISK",
                ["risk", "drawdown", "dangerous", "safe", "volatil", "downside"],
                "The user is asking about risk or downside exposure. Focus on historical volatility, drawdown potentials (max drawdown), Average True Range (ATR), and support breaches under bearish scenarios."
            ),
            IntentStrategy(
                "LONG_TERM",
                ["long term", "5 year", "10 year", "future", "outlook", "fundamental", "growth", "earnings", "valuation", "overvalued", "undervalued", "cheap", "expensive"],
                "The user is asking about long-term investing outlook (e.g., 5+ years). Focus on fundamentals, growth runways, competitive moats, valuation multiples, and structural long-term moving averages (like SMA 200)."
            ),
            IntentStrategy(
                "WHY_MOVING",
                ["why is it", "why did it", "reason for", "falling", "rising", "drop", "surge", "spike", "crash", "sentiment", "news"],
                "The user is asking why the price is rising or falling. Focus on connecting news catalysts, earnings updates, analyst rating upgrades/downgrades, and volume breakouts to the price movement."
            ),
            IntentStrategy(
                "COMPARE",
                ["compare", "versus", " vs ", "relative to"],
                "The user is asking to compare this active asset with another. Contrast their relative strengths, volatility scores, relative valuations, and buy/hold ratios."
            )
        ]

    def detect_intent(self, message: str) -> str:
        for strategy in self.strategies:
            if strategy.matches(message):
                return strategy.name
        return "GENERAL"

    def get_guideline(self, intent: str) -> str:
        for strategy in self.strategies:
            if strategy.name == intent:
                return strategy.guideline
        return "Provide a comprehensive, expert-level market analysis covering the active asset's current technical posture and outlook."

    def detect_portfolio_context(self, history: list[ChatMessage], current_message: str) -> bool:
        text_to_scan = current_message.lower()
        for msg in history:
            if msg.role == ChatRole.USER:
                text_to_scan += " " + msg.content.lower()
                
        holdings_patterns = [
            r"\b(?:own|have|bought|purchased|holding|position of)\s+(\d+|\b(?:some|a few|a lot of)\b)",
            r"\bmy\s+portfolio\b",
            r"\balready\s+own\b"
        ]
        for pattern in holdings_patterns:
            if re.search(pattern, text_to_scan):
                return True
        return False


# Global reasoning engine instance
reasoning_engine = ReasoningEngine()
