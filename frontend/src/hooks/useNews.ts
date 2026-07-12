"use client";

import { usePolledResource } from "@/hooks/usePolledResource";
import { api } from "@/lib/api";

// Headlines refresh more often than analyst ratings but still nowhere near quote/candle
// cadence - no need for this to ride the live WebSocket hub.
const NEWS_POLL_MS = 10 * 60 * 1000;

export function useNews(symbol: string, count = 8) {
  return usePolledResource(() => api.getNews(symbol, count), [symbol, count], NEWS_POLL_MS);
}
