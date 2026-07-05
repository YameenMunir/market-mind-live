"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { FORECAST_POLL_MS } from "@/lib/constants";
import { usePolledResource } from "@/hooks/usePolledResource";

export function usePriceForecast(symbol: string, horizonDays: number, enabled: boolean) {
  const fetcher = useCallback(() => api.getPriceForecast(symbol, horizonDays), [symbol, horizonDays]);
  return usePolledResource(fetcher, [symbol, horizonDays], FORECAST_POLL_MS, enabled);
}
