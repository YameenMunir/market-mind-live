import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAssetSearch } from "@/hooks/useAssetSearch";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body } as Response);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  global.fetch = undefined as unknown as typeof fetch;
});

describe("useAssetSearch", () => {
  it("aborts the previous in-flight request when a newer query supersedes it", async () => {
    const abortedUrls: string[] = [];
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          abortedUrls.push(url);
          reject(new DOMException("Aborted", "AbortError"));
        });
        if (url.includes("q=MSFT")) {
          resolve({ ok: true, status: 200, json: async () => [{ symbol: "MSFT" }] } as Response);
        }
      });
    });

    const { result, rerender } = renderHook(({ query }) => useAssetSearch(query), { initialProps: { query: "AA" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200); // fire the first debounced request
    });

    rerender({ query: "MSFT" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200); // fire the second debounced request, aborting the first
    });

    expect(abortedUrls.some((u) => u.includes("q=AA"))).toBe(true);
    expect(result.current.results).toEqual([{ symbol: "MSFT" }]);
    expect(result.current.error).toBeNull();
  });

  it("distinguishes a failed search from a genuinely empty result set", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      jsonResponse({ error_code: "network_error", message: "down" }, false, 503)
    );

    const { result } = renderHook(() => useAssetSearch("AAPL"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error?.errorCode).toBe("network_error");
  });

  it("clears a previous error once a subsequent search succeeds", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) return jsonResponse({ error_code: "network_error", message: "down" }, false, 503);
      return jsonResponse([{ symbol: "AAPL" }]);
    });

    const { result, rerender } = renderHook(({ query }) => useAssetSearch(query), { initialProps: { query: "A" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.error?.errorCode).toBe("network_error");

    rerender({ query: "AAPL" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([{ symbol: "AAPL" }]);
  });
});
