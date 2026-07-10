"use client";

import { useMemo } from "react";

import { useCurrencyContext } from "@/contexts/CurrencyContext";
import type { CandleSeries, PriceForecast } from "@/types";

interface UseCurrencyConvertedChartDataArgs {
  candles: CandleSeries | null | undefined;
  forecast: PriceForecast | null | undefined;
  supportLevels: number[];
  resistanceLevels: number[];
  /** Currency the underlying data is actually denominated in (e.g. `quote.currency`) -
   * conversion is a no-op whenever this already matches the selected display currency. */
  nativeCurrency: string;
}

/** Converts a candle series, a price forecast, and support/resistance levels into the
 * user's selected display currency. Extracted from dashboard/page.tsx and
 * FullscreenChartModal.tsx, which independently ran the identical conversion logic
 * for the same chart data shown in two different chrome (inline panel vs. fullscreen) -
 * this is the one thing that actually needs to match between them byte-for-byte,
 * unlike the surrounding layout, which legitimately differs. */
export function useCurrencyConvertedChartData({
  candles,
  forecast,
  supportLevels,
  resistanceLevels,
  nativeCurrency,
}: UseCurrencyConvertedChartDataArgs) {
  const { currency, convert } = useCurrencyContext();

  const convertedCandles = useMemo(() => {
    if (!candles) return null;
    if (nativeCurrency === currency) return candles;
    return {
      ...candles,
      candles: candles.candles.map((c) => ({
        ...c,
        open: convert(c.open, nativeCurrency) ?? c.open,
        high: convert(c.high, nativeCurrency) ?? c.high,
        low: convert(c.low, nativeCurrency) ?? c.low,
        close: convert(c.close, nativeCurrency) ?? c.close,
      })),
    };
  }, [candles, currency, nativeCurrency, convert]);

  const convertedSupport = useMemo(
    () => supportLevels.map((v) => convert(v, nativeCurrency) ?? v),
    [supportLevels, nativeCurrency, convert]
  );
  const convertedResistance = useMemo(
    () => resistanceLevels.map((v) => convert(v, nativeCurrency) ?? v),
    [resistanceLevels, nativeCurrency, convert]
  );

  const convertedForecast: PriceForecast | null = useMemo(() => {
    if (!forecast) return null;
    if (nativeCurrency === currency) return forecast;
    return {
      ...forecast,
      last_actual_price: convert(forecast.last_actual_price, nativeCurrency) ?? forecast.last_actual_price,
      points: forecast.points.map((p) => ({
        ...p,
        predicted_price: convert(p.predicted_price, nativeCurrency) ?? p.predicted_price,
        lower_bound: convert(p.lower_bound, nativeCurrency) ?? p.lower_bound,
        upper_bound: convert(p.upper_bound, nativeCurrency) ?? p.upper_bound,
      })),
    };
  }, [forecast, currency, nativeCurrency, convert]);

  return { convertedCandles, convertedForecast, convertedSupport, convertedResistance };
}
