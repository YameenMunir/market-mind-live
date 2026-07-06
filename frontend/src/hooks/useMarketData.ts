"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { CANDLE_POLL_MS, CANDLE_POLL_MS_BY_RANGE } from "@/lib/constants";
import { usePolledResource } from "@/hooks/usePolledResource";

export function useCandles(symbol: string, range: string) {
  const fetcher = useCallback(() => api.getCandles(symbol, range), [symbol, range]);
  const pollMs = CANDLE_POLL_MS_BY_RANGE[range] ?? CANDLE_POLL_MS;
  return usePolledResource(fetcher, [symbol, range], pollMs);
}
