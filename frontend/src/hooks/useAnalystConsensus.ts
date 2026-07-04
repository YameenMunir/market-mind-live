"use client";

import { usePolledResource } from "@/hooks/usePolledResource";
import { api } from "@/lib/api";

// Analyst ratings/price targets move at most a few times a month, not intraday - no
// need for this to ride the live WebSocket hub alongside quote/indicator polling.
const ANALYST_POLL_MS = 30 * 60 * 1000;

export function useAnalystConsensus(symbol: string) {
  return usePolledResource(() => api.getAnalystConsensus(symbol), [symbol], ANALYST_POLL_MS);
}
