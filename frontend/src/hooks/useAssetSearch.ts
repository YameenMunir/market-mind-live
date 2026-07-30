"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { ApiError } from "@/types";
import type { AssetSearchResult, AssetType } from "@/types";

// Debounces keystrokes before firing a request at all - cuts request volume for fast
// typing without meaningfully delaying results for normal typing speed.
const DEBOUNCE_MS = 200;

export function useAssetSearch(query: string, assetType?: AssetType) {
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Distinguishes "the API call failed" from "it succeeded with zero matches" - the
  // two need different empty-state copy (a technical-free "search is temporarily
  // unavailable" vs. a normal "no matches"), and silently collapsing both into an
  // empty array made a real outage look identical to "nothing found".
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      // A newer keystroke's debounced call always supersedes whatever the previous
      // one was still waiting on, instead of both requests racing to completion.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await api.searchAssets(query, assetType, controller.signal);
        if (!cancelled) {
          setResults(data);
          setError(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // superseded, not a real failure
        if (!cancelled) {
          setResults([]);
          setError(err instanceof ApiError ? err : new ApiError({ error_code: "internal_error", message: "Search failed." }));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, assetType]);

  return { results, isLoading, error };
}
