"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/types";

interface PolledResourceState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

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
    setState({ data: null, isLoading: true, error: null });

    const run = async () => {
      try {
        const data = await fetcherRef.current();
        if (cancelled) return;
        setState({ data, isLoading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        const apiError =
          err instanceof ApiError ? err : new ApiError({ error_code: "internal_error", message: "Something went wrong." });
        setState((prev) => ({ data: prev.data, isLoading: false, error: apiError }));
      }
    };

    run();
    const timer = setInterval(run, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return state;
}
