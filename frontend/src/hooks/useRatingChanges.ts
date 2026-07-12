"use client";

import { usePolledResource } from "@/hooks/usePolledResource";
import { api } from "@/lib/api";

// Rating-change events are rarer than the aggregate consensus updating - same cadence
// as useAnalystConsensus.
const RATING_CHANGES_POLL_MS = 30 * 60 * 1000;

export function useRatingChanges(symbol: string, count = 10) {
  return usePolledResource(() => api.getRatingChanges(symbol, count), [symbol, count], RATING_CHANGES_POLL_MS);
}
