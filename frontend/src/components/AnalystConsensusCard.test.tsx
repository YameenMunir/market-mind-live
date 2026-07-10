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

    expect(screen.getByText("Temporarily rate-limited")).toBeInTheDocument();
    expect(
      screen.getByText("The market data provider is busy right now - this will retry automatically.")
    ).toBeInTheDocument();
  });

  it("shows a distinct message for a non-rate-limit error", () => {
    const error = new ApiError({ error_code: "network_error", message: "Could not reach the service." });
    render(<AnalystConsensusCard consensus={null} isLoading={false} error={error} symbol="AAPL" />);

    expect(screen.getByText("Couldn't load analyst data")).toBeInTheDocument();
    expect(screen.getByText("Could not reach the service.")).toBeInTheDocument();
  });

  it("shows a loading skeleton, not the error fallback, while a request is in flight", () => {
    render(<AnalystConsensusCard consensus={null} isLoading={true} error={null} symbol="AAPL" />);

    expect(screen.queryByText("Temporarily rate-limited")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Temporarily rate-limited")).not.toBeInTheDocument();
  });
});
