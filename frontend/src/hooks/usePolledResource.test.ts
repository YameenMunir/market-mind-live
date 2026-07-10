import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePolledResource } from "@/hooks/usePolledResource";
import { ApiError } from "@/types";

// Backoff includes up to 25% random jitter (see usePolledResource.ts) - pin it to 0
// so retry timing is deterministic in these tests.
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePolledResource", () => {
  it("returns data on a successful fetch", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => usePolledResource(fetcher, [], 60_000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.data).toEqual({ value: 1 });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a rate_limited ApiError instead of staying loading or blank", async () => {
    const error = new ApiError({ error_code: "rate_limited", message: "busy" });
    const fetcher = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => usePolledResource(fetcher, [], 60_000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error?.errorCode).toBe("rate_limited");
  });

  it("retries well before the normal poll interval after a failure, and clears the error as soon as the retry succeeds", async () => {
    const error = new ApiError({ error_code: "rate_limited", message: "busy" });
    const fetcher = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ value: 42 });

    const { result } = renderHook(() => usePolledResource(fetcher, [], 60_000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error?.errorCode).toBe("rate_limited");

    // First backoff retry (base delay, no jitter) fires at 3s - far sooner than the
    // 60s configured poll interval.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ value: 42 });
  });

  it("keeps the last-known-good data visible while a later poll is failing", async () => {
    const error = new ApiError({ error_code: "network_error", message: "down" });
    const fetcher = vi.fn().mockResolvedValueOnce({ value: 1 }).mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePolledResource(fetcher, [], 60_000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ value: 1 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(result.current.data).toEqual({ value: 1 });
    expect(result.current.error?.errorCode).toBe("network_error");
  });

  it("caps retry backoff at the configured poll interval instead of retrying unboundedly often", async () => {
    const error = new ApiError({ error_code: "network_error", message: "down" });
    const fetcher = vi.fn().mockRejectedValue(error);

    renderHook(() => usePolledResource(fetcher, [], 10_000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    // Backoff (3s, 6s, then capped at 10s) over 60s of persistent failure works out to
    // exactly 8 calls with jitter pinned to 0 - well short of a naive fixed-interval
    // "hammer every few seconds" retry loop, proving retries stay bounded.
    expect(fetcher).toHaveBeenCalledTimes(8);
  });
});
