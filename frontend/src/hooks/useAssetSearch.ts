"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { AssetSearchResult, AssetType } from "@/types";

export function useAssetSearch(query: string, assetType?: AssetType) {
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await api.searchAssets(query, assetType);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, assetType]);

  return { results, isLoading };
}
