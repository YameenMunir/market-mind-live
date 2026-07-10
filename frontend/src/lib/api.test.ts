import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";

describe("api request handling", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves normally on a successful response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: "AAPL", rating: "buy" }),
    } as Response);

    const result = await api.getAnalystConsensus("AAPL");
    expect(result).toEqual({ symbol: "AAPL", rating: "buy" });
  });

  it("throws a rate_limited ApiError for a 429 JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error_code: "rate_limited", message: "busy" }),
    } as Response);

    await expect(api.getAnalystConsensus("AAPL")).rejects.toMatchObject({
      errorCode: "rate_limited",
    });
  });

  it("throws a network_error ApiError for a 503 JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error_code: "network_error", message: "unavailable" }),
    } as Response);

    await expect(api.getAnalystConsensus("AAPL")).rejects.toMatchObject({
      errorCode: "network_error",
    });
  });

  it("aborts and surfaces a network_error instead of hanging forever if the backend never responds", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const pending = api.getAnalystConsensus("AAPL");
    const assertion = expect(pending).rejects.toMatchObject({ errorCode: "network_error" });

    await vi.advanceTimersByTimeAsync(25_000);
    await assertion;
  });
});
