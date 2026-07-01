"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { CANDLE_POLL_MS, INDICATOR_POLL_MS } from "@/lib/constants";
import { usePolledResource } from "@/hooks/usePolledResource";

export function useCandles(symbol: string, interval: string) {
  const fetcher = useCallback(() => api.getCandles(symbol, interval), [symbol, interval]);
  return usePolledResource(fetcher, [symbol, interval], CANDLE_POLL_MS);
}

export function useIndicators(symbol: string) {
  const fetcher = useCallback(() => api.getIndicators(symbol), [symbol]);
  return usePolledResource(fetcher, [symbol], INDICATOR_POLL_MS);
}

export function usePrediction(symbol: string) {
  const fetcher = useCallback(() => api.getPrediction(symbol), [symbol]);
  return usePolledResource(fetcher, [symbol], INDICATOR_POLL_MS);
}

export function useRisk(symbol: string) {
  const fetcher = useCallback(() => api.getRisk(symbol), [symbol]);
  return usePolledResource(fetcher, [symbol], INDICATOR_POLL_MS);
}
