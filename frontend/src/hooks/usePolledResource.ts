"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/types";

interface PolledResourceState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

// On a failed poll, retry sooner than the normal cadence so a transient failure (rate
// limit, timeout, provider hiccup) recovers as soon as it clears instead of leaving the
// UI on a fallback/error state until the next scheduled poll. Backs off exponentially,
// with jitter so many cards failing at once don't retry in lockstep, and is capped at
// the resource's own poll interval - a persistent failure never ends up retrying *more*
// often than a healthy resource would normally be polled.
const RETRY_BASE_MS = 3_000;
const RETRY_JITTER_RATIO = 0.25;

export function usePolledResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  intervalMs: number,
  enabled: boolean = true
): PolledResourceState<T> {
  const [state, setState] = useState<PolledResourceState<T>>({ data: null, isLoading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let consecutiveFailures = 0;
    setState({ data: null, isLoading: true, error: null });

    const scheduleNext = (delayMs: number) => {
      if (cancelled) return;
      timer = setTimeout(run, delayMs);
    };

    const run = async () => {
      try {
        const data = await fetcherRef.current();
        if (cancelled) return;
        consecutiveFailures = 0;
        setState({ data, isLoading: false, error: null });
        scheduleNext(intervalMs);
      } catch (err) {
        if (cancelled) return;
        const apiError =
          err instanceof ApiError ? err : new ApiError({ error_code: "internal_error", message: "Something went wrong." });
        // Keep the last-known-good data (if any) so a transient failure doesn't blank
        // out data that's still reasonably fresh - only the error/loading flags change.
        setState((prev) => ({ data: prev.data, isLoading: false, error: apiError }));
        consecutiveFailures += 1;
        const backoff = Math.min(RETRY_BASE_MS * 2 ** (consecutiveFailures - 1), intervalMs);
        scheduleNext(backoff + backoff * RETRY_JITTER_RATIO * Math.random());
      }
    };

    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return state;
}
