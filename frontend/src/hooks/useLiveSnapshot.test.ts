import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";

const originalWebSocket = global.WebSocket;

function fakeQuote(price: number) {
  return {
    symbol: "AAPL",
    price,
    change: 1,
    change_percent: 1,
    previous_close: price - 1,
    day_high: price + 1,
    day_low: price - 2,
    volume: 1000,
    currency: "USD",
    as_of: "2026-01-01T00:00:00Z",
    is_delayed: true,
  };
}

function fakeStatus() {
  return {
    symbol: "AAPL",
    asset_type: "stock",
    session: "closed",
    is_open: false,
    message: "Market is currently closed.",
    next_change_utc: null,
    timezone: "America/New_York",
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body } as Response);
}

// Every test forces the REST-fallback path: jsdom ships a real WebSocket
// implementation that would otherwise attempt a genuine (and unpredictable, slow)
// network connection to a nonexistent local server before falling back.
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  // @ts-expect-error -- intentionally removing a normally-required global for this test file
  delete window.WebSocket;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  global.fetch = undefined as unknown as typeof fetch;
  window.WebSocket = originalWebSocket;
});

describe("useLiveSnapshot (REST fallback path)", () => {
  it("applies a successful quote even when market status fails in the same cycle (Promise.allSettled)", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/quote")) return jsonResponse(fakeQuote(100));
      if (url.includes("/status/")) return jsonResponse({ error_code: "network_error", message: "down" }, false, 503);
      return jsonResponse({});
    });

    const { result } = renderHook(() => useLiveSnapshot("AAPL"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.quote?.price).toBe(100);
    expect(result.current.marketStatus).toBeNull();
    expect(result.current.errorCode).toBe("network_error");
  });

  it("shows the required clear message and recovers with a fast backoff retry after an internal_error", async () => {
    let quoteCalls = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/quote")) {
        quoteCalls += 1;
        if (quoteCalls === 1) {
          return jsonResponse({ error_code: "internal_error", message: "Unexpected error refreshing live data." }, false, 500);
        }
        return jsonResponse(fakeQuote(200));
      }
      if (url.includes("/status/")) return jsonResponse(fakeStatus());
      return jsonResponse({});
    });

    const { result } = renderHook(() => useLiveSnapshot("AAPL"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.errorMessage).toBe(
      "Live data could not be refreshed. Showing the most recently available data. Please try again shortly."
    );
    // The failed market-status/quote pairing above still resolves the market status
    // successfully, but the quote failure must not have cleared it - and the
    // connection must reflect a real problem, not silently look "live".
    expect(result.current.connectionState).toBe("error");

    // Backoff retry (base delay, no jitter - Math.random is pinned to 0) fires at 3s,
    // well before the normal 8s poll cadence.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(quoteCalls).toBe(2);
    expect(result.current.quote?.price).toBe(200);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.connectionState).toBe("polling");
  });

  it("keeps the last successful quote visible while a later poll is failing", async () => {
    let quoteCalls = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/quote")) {
        quoteCalls += 1;
        if (quoteCalls === 1) return jsonResponse(fakeQuote(150));
        return jsonResponse({ error_code: "network_error", message: "down" }, false, 503);
      }
      if (url.includes("/status/")) return jsonResponse(fakeStatus());
      return jsonResponse({});
    });

    const { result } = renderHook(() => useLiveSnapshot("AAPL"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.quote?.price).toBe(150);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(result.current.quote?.price).toBe(150);
    expect(result.current.errorCode).toBe("network_error");
    expect(result.current.isStale).toBe(true);
  });

  it("retry() cancels the previous poll and fetches again immediately", async () => {
    let quoteCalls = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/quote")) {
        quoteCalls += 1;
        return jsonResponse(fakeQuote(quoteCalls === 1 ? 100 : 300));
      }
      if (url.includes("/status/")) return jsonResponse(fakeStatus());
      return jsonResponse({});
    });

    const { result } = renderHook(() => useLiveSnapshot("AAPL"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.quote?.price).toBe(100);
    const callsBeforeRetry = quoteCalls;

    await act(async () => {
      result.current.retry();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(quoteCalls).toBeGreaterThan(callsBeforeRetry);
    expect(result.current.quote?.price).toBe(300);
  });
});
