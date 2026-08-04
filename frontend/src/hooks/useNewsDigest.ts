"use client";

import { usePolledResource } from "@/hooks/usePolledResource";
import { api } from "@/lib/api";

// Matches the backend's own digest cache TTL (NEWS_DIGEST_CACHE_TTL_SECONDS, default
// 30 min, see backend/config.py) - polling faster than the backend actually
// regenerates would just re-fetch the same cached value.
const NEWS_DIGEST_POLL_MS = 30 * 60 * 1000;

export function useNewsDigest(symbol: string) {
  return usePolledResource(() => api.getNewsDigest(symbol), [symbol], NEWS_DIGEST_POLL_MS);
}
