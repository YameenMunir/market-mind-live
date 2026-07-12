import type { AIAssetContext, ChatMessage } from "@/types";

interface FollowUpCategory {
  /** Mirrors backend/services/mock_ai_provider.py's `_intent()` keyword categories,
   * so "has the user already asked about this" here agrees with how the assistant
   * itself would classify a question about the same topic. */
  keywords: string[];
  question: string;
  isAvailable: (context: AIAssetContext) => boolean;
}

// Ordered by what a user would naturally want to know progressively - the current
// call, then why, then supporting detail. "compare" is deliberately not offered here:
// the assistant can only see the current asset's data, so suggesting a cross-asset
// question would just lead to it explaining it can't answer that.
const CATEGORIES: FollowUpCategory[] = [
  {
    keywords: ["signal", "buy", "sell", "hold", "should i"],
    question: "What's the current buy/sell signal?",
    isAvailable: (c) => c.prediction != null,
  },
  {
    keywords: ["risk", "drawdown", "volatil"],
    question: "What's driving the risk score?",
    isAvailable: (c) => c.risk != null,
  },
  {
    keywords: ["indicator", "rsi", "macd", "bollinger", "moving average", "sma", "ema"],
    question: "How are RSI and MACD looking right now?",
    isAvailable: (c) => c.technical_indicators != null,
  },
  {
    keywords: ["news", "headline", "article", "press"],
    question: "Any recent news I should know about?",
    isAvailable: (c) => c.news.length > 0,
  },
  {
    keywords: ["upgrade", "downgrade", "rating change", "analyst action"],
    question: "Have there been any analyst upgrades or downgrades?",
    isAvailable: (c) => c.rating_changes.length > 0,
  },
  {
    keywords: ["backtest", "win rate", "sharpe", "reliable", "reliability"],
    question: "How has this strategy performed historically?",
    isAvailable: (c) => c.backtesting?.available === true,
  },
  {
    keywords: ["confiden", "uncertain", "sure"],
    question: "How confident is the model in this call?",
    isAvailable: (c) => c.prediction != null,
  },
  {
    keywords: ["beginner", "simple", "explain like", "eli5"],
    question: "Can you explain this in plain English?",
    isAvailable: () => true,
  },
];

const MAX_SUGGESTIONS = 3;

/** Suggests follow-up questions after an assistant reply, tailored to what hasn't
 * come up yet in this conversation and what the current context can actually answer
 * (e.g. no backtest question before one's been run). Purely a local heuristic - no
 * extra API call, nothing sent to Gemini or the mock provider. */
export function getFollowUpSuggestions(context: AIAssetContext | null, messages: ChatMessage[]): string[] {
  if (!context) return [];

  const askedText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" \n ");

  const suggestions: string[] = [];
  for (const category of CATEGORIES) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (!category.isAvailable(context)) continue;
    const alreadyAsked = category.keywords.some((keyword) => askedText.includes(keyword));
    if (alreadyAsked) continue;
    suggestions.push(category.question);
  }
  return suggestions;
}
