import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalystConsensusCard } from "@/components/AnalystConsensusCard";
import { ApiError } from "@/types";

// AnalystConsensusCard reads currency conversion off this context - stub it so tests
// don't need to mount the real provider.
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrencyContext: () => ({ currency: "USD", convert: (value: number) => value }),
}));

describe("AnalystConsensusCard", () => {
  it("shows the rate-limited fallback with the exact expected wording, not a blank/loading/-- state", () => {
    const error = new ApiError({ error_code: "rate_limited", message: "ignored for this branch" });
    render(<AnalystConsensusCard consensus={null} isLoading={false} error={error} symbol="AAPL" />);

    expect(screen.getByText("Rate-Limited")).toBeInTheDocument();
    expect(screen.getByText("The market data provider is busy. Automatic retry active.")).toBeInTheDocument();
  });

  it("shows a distinct message for a non-rate-limit error", () => {
    const error = new ApiError({ error_code: "network_error", message: "Could not reach the service." });
    render(<AnalystConsensusCard consensus={null} isLoading={false} error={error} symbol="AAPL" />);

    expect(screen.getByText("Load Failed")).toBeInTheDocument();
    expect(screen.getByText("Could not reach the service.")).toBeInTheDocument();
  });

  it("shows a loading skeleton, not the error fallback, while a request is in flight", () => {
    render(<AnalystConsensusCard consensus={null} isLoading={true} error={null} symbol="AAPL" />);

    expect(screen.queryByText("Rate-Limited")).not.toBeInTheDocument();
    expect(screen.getAllByText("Loading...").length).toBeGreaterThan(0);
  });

  it("renders real consensus data once a retry succeeds, replacing the fallback", () => {
    render(
      <AnalystConsensusCard
        consensus={{
          symbol: "AAPL",
          rating: "buy",
          total_analysts: 10,
          strong_buy: 2,
          buy: 6,
          hold: 2,
          sell: 0,
          strong_sell: 0,
          price_target_low: 100,
          price_target_high: 200,
          price_target_mean: 150,
          price_target_median: 150,
          recommendation_trend: [],
          currency: "USD",
          as_of: "2026-07-10T00:00:00+00:00",
          is_stale: false,
        }}
        isLoading={false}
        error={null}
        symbol="AAPL"
      />
    );

    expect(screen.getAllByText("Buy").length).toBeGreaterThan(0);
    expect(screen.queryByText("Rate-Limited")).not.toBeInTheDocument();
  });

  it("shows a 3-month sentiment trend with direction when history has more than one point", () => {
    render(
      <AnalystConsensusCard
        consensus={{
          symbol: "AAPL",
          rating: "buy",
          total_analysts: 18,
          strong_buy: 4,
          buy: 14,
          hold: 0,
          sell: 0,
          strong_sell: 0,
          price_target_low: 100,
          price_target_high: 200,
          price_target_mean: 150,
          price_target_median: 150,
          recommendation_trend: [
            { months_ago: 3, strong_buy: 2, buy: 10, hold: 2, sell: 0, strong_sell: 0 },
            { months_ago: 2, strong_buy: 3, buy: 11, hold: 1, sell: 0, strong_sell: 0 },
            { months_ago: 1, strong_buy: 3, buy: 13, hold: 0, sell: 0, strong_sell: 0 },
            { months_ago: 0, strong_buy: 4, buy: 14, hold: 0, sell: 0, strong_sell: 0 },
          ],
          currency: "USD",
          as_of: "2026-07-10T00:00:00+00:00",
          is_stale: false,
        }}
        isLoading={false}
        error={null}
        symbol="AAPL"
      />
    );

    expect(screen.getByText("3-Month Trend")).toBeInTheDocument();
    // 12 bullish (2+10) 3mo ago -> 18 bullish (4+14) now: +6 improving.
    expect(screen.getByText(/\+6 buy-rated/)).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("-3mo")).toBeInTheDocument();
  });

  it("hides the trend section when fewer than two history points are available", () => {
    render(
      <AnalystConsensusCard
        consensus={{
          symbol: "AAPL",
          rating: "buy",
          total_analysts: 10,
          strong_buy: 2,
          buy: 6,
          hold: 2,
          sell: 0,
          strong_sell: 0,
          price_target_low: 100,
          price_target_high: 200,
          price_target_mean: 150,
          price_target_median: 150,
          recommendation_trend: [],
          currency: "USD",
          as_of: "2026-07-10T00:00:00+00:00",
          is_stale: false,
        }}
        isLoading={false}
        error={null}
        symbol="AAPL"
      />
    );

    expect(screen.queryByText("3-Month Trend")).not.toBeInTheDocument();
  });
});
