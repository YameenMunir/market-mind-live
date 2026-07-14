import { describe, expect, it } from "vitest";

import { getFollowUpSuggestions } from "@/lib/followUpSuggestions";
import type { AIAssetContext, ChatMessage } from "@/types";

function baseContext(overrides: Partial<AIAssetContext> = {}): AIAssetContext {
  return {
    asset: "AAPL",
    asset_name: "Apple Inc.",
    latest_price: 200,
    price_change: 1,
    price_change_percent: 0.5,
    timeframe: "1D",
    market_status: "open",
    is_market_open: true,
    last_updated: "2026-01-01T00:00:00Z",
    data_is_delayed: true,
    technical_indicators: null,
    prediction: null,
    risk: null,
    backtesting: null,
    news: [],
    rating_changes: [],
    prediction_history_count: 0,
    missing_data: [],
    comparison: null,
    ...overrides,
  };
}

function userMessage(content: string): ChatMessage {
  return { message_id: `m-${content}`, role: "user", content, created_at: "2026-01-01T00:00:00Z" };
}

describe("getFollowUpSuggestions", () => {
  it("returns nothing without a context", () => {
    expect(getFollowUpSuggestions(null, [])).toEqual([]);
  });

  it("only suggests categories the current context can actually answer", () => {
    const context = baseContext({ prediction: { signal: "buy" } as AIAssetContext["prediction"] });
    const suggestions = getFollowUpSuggestions(context, []);
    // "risk"/"indicators"/"news"/"rating_changes"/"backtest" all require data that's
    // null/empty here - only "signal", "confidence" (both gated on prediction), and
    // the always-available "beginner" question should show up.
    expect(suggestions).toContain("What's the current buy/sell signal?");
    expect(suggestions).not.toContain("What's driving the risk score?");
    expect(suggestions).not.toContain("Any recent news I should know about?");
  });

  it("skips a category the user already asked about", () => {
    const context = baseContext({
      prediction: { signal: "buy" } as AIAssetContext["prediction"],
      risk: { level: "medium" } as AIAssetContext["risk"],
    });
    const messages = [userMessage("What's the risk level here?")];

    const suggestions = getFollowUpSuggestions(context, messages);
    expect(suggestions).not.toContain("What's driving the risk score?");
    expect(suggestions).toContain("What's the current buy/sell signal?");
  });

  it("caps suggestions at 3 even when many categories are available", () => {
    const context = baseContext({
      prediction: { signal: "buy" } as AIAssetContext["prediction"],
      risk: { level: "medium" } as AIAssetContext["risk"],
      technical_indicators: {} as AIAssetContext["technical_indicators"],
      news: [{ title: "x" } as AIAssetContext["news"][number]],
      rating_changes: [{ firm: "x" } as AIAssetContext["rating_changes"][number]],
      backtesting: { available: true } as AIAssetContext["backtesting"],
    });

    expect(getFollowUpSuggestions(context, [])).toHaveLength(3);
  });

  it("falls back to the always-available beginner question when nothing else qualifies", () => {
    const context = baseContext();
    expect(getFollowUpSuggestions(context, [])).toEqual(["Can you explain this in plain English?"]);
  });
});
