"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { CANDLE_POLL_MS } from "@/lib/constants";
import { usePolledResource } from "@/hooks/usePolledResource";

export function useCandles(symbol: string, interval: string) {
  const fetcher = useCallback(() => api.getCandles(symbol, interval), [symbol, interval]);
  return usePolledResource(fetcher, [symbol, interval], CANDLE_POLL_MS);
}
