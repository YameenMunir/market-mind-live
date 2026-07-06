"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, Camera, Minus, Moon, RotateCcw, Sunrise, Sunset, X } from "lucide-react";

import { Button } from "@/components/Button";
import { ChartOverlayToggles } from "@/components/ChartOverlayToggles";
import { PricePredictorControls } from "@/components/PricePredictorControls";
import { StatusBanner } from "@/components/StatusBanner";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { LiveCandlestickChart, type LiveCandlestickChartHandle } from "@/charts/LiveCandlestickChart";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { LastUpdated } from "@/components/LastUpdated";
import { CHART_RANGES } from "@/lib/constants";
import { cn, formatPercent, formatPrice } from "@/lib/utils";
import type { ApiError, CandleSeries, MarketStatus, PredictionResult, PriceForecast, PriceQuote } from "@/types";

const SESSION_META = {
  open: { label: "Market Open", icon: Activity, dot: "bg-bull" },
  closed: { label: "Market Closed", icon: Moon, dot: "bg-ink-faint" },
  pre_market: { label: "Pre-Market", icon: Sunrise, dot: "bg-warn" },
  after_hours: { label: "After Hours", icon: Sunset, dot: "bg-warn" },
} as const;

interface FullscreenChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  assetName?: string | null;
  range: string;
  onRangeChange: (value: string) => void;
  showMA: boolean;
  onToggleMA: (value: boolean) => void;
  showBB: boolean;
  onToggleBB: (value: boolean) => void;
  showPricePredictor: boolean;
  onTogglePricePredictor: (value: boolean) => void;
  horizonDays: number;
  onHorizonChange: (value: number) => void;
  forecast: PriceForecast | null;
  isLoadingForecast: boolean;
  candles: CandleSeries | null;
  isLoadingCandles: boolean;
  candlesError?: ApiError | null;
  quote: PriceQuote | null;
  marketStatus: MarketStatus | null;
  supportLevels: number[];
  resistanceLevels: number[];
  prediction: PredictionResult | null;
  theme: "dark" | "light";
}

export function FullscreenChartModal({
  isOpen,
  onClose,
  symbol,
  assetName,
  range,
  onRangeChange,
  showMA,
  onToggleMA,
  showBB,
  onToggleBB,
  showPricePredictor,
  onTogglePricePredictor,
  horizonDays,
  onHorizonChange,
  forecast,
  isLoadingForecast,
  candles,
  isLoadingCandles,
  candlesError,
  quote,
  marketStatus,
  supportLevels,
  resistanceLevels,
  prediction,
  theme,
}: FullscreenChartModalProps) {
  const chartHandleRef = useRef<LiveCandlestickChartHandle>(null);
  const { currency, convert } = useCurrencyContext();
  const nativeCurrency = quote?.currency ?? "USD";

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

  const convertedSupport = supportLevels.map((v) => convert(v, nativeCurrency) ?? v);
  const convertedResistance = resistanceLevels.map((v) => convert(v, nativeCurrency) ?? v);

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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const sessionMeta = marketStatus ? SESSION_META[marketStatus.session] : null;
  const SessionIcon = sessionMeta?.icon ?? Activity;
  const isPositive = (quote?.change ?? 0) >= 0;
  const isFlat = (quote?.change ?? 0) === 0;

  const handleScreenshot = () => {
    const dataUrl = chartHandleRef.current?.takeScreenshot();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${symbol}-${range}-chart.png`;
    link.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex flex-col bg-canvas"
        >
          <div className="relative shrink-0 border-b border-border px-4 py-3.5 sm:px-6">
            <Button
              variant="secondary"
              size="icon"
              onClick={onClose}
              aria-label="Close full-screen chart"
              className="absolute right-4 top-3.5 sm:right-6"
            >
              <X size={17} />
            </Button>

            <div className="flex flex-wrap items-start gap-x-6 gap-y-2 pr-12">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Live Chart</p>
                <h2 className="mt-0.5 text-lg font-semibold text-ink">
                  {assetName ? `${assetName} · ${symbol}` : symbol}
                  <span className="ml-2 text-sm font-medium text-ink-faint">
                    {CHART_RANGES.find((r) => r.value === range)?.label}
                  </span>
                </h2>
              </div>

              {quote && (
                <div>
                  <p className="numeric font-mono text-lg font-semibold text-ink">
                    {formatPrice(convert(quote.price, nativeCurrency), currency)}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      isFlat ? "text-ink-muted" : isPositive ? "text-bull" : "text-bear"
                    )}
                  >
                    {isFlat ? <Minus size={12} /> : isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span className="numeric">{formatPrice(convert(quote.change, nativeCurrency), currency)}</span>
                    <span className="numeric">({formatPercent(quote.change_percent)})</span>
                  </div>
                </div>
              )}

              {sessionMeta && (
                <div className="flex items-center gap-2 self-center">
                  <span className={cn("h-1.5 w-1.5 rounded-full", sessionMeta.dot)} />
                  <SessionIcon size={13} className="text-ink-faint" />
                  <span className="text-xs font-medium text-ink-muted">{sessionMeta.label}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-4 py-3 sm:px-6">
            <TimeframeSelector value={range} onChange={onRangeChange} />
            <ChartOverlayToggles showMA={showMA} onToggleMA={onToggleMA} showBB={showBB} onToggleBB={onToggleBB} />
            <PricePredictorControls
              enabled={showPricePredictor}
              onToggle={onTogglePricePredictor}
              horizonDays={horizonDays}
              onHorizonChange={onHorizonChange}
            />
            <div className="ml-auto flex items-center gap-3">
              {candles && !isLoadingCandles && <LastUpdated updatedAt={candles.last_updated} />}
              <Button variant="secondary" size="sm" onClick={() => chartHandleRef.current?.fitContent()}>
                <RotateCcw size={13} />
                Reset zoom
              </Button>
              <Button variant="secondary" size="sm" onClick={handleScreenshot}>
                <Camera size={13} />
                Export PNG
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 p-4 sm:p-6">
            {candlesError && (
              <StatusBanner message={candlesError.message} tone="warning" icon="warning" className="mb-3" />
            )}
            {showPricePredictor && isLoadingForecast && !forecast && (
              <StatusBanner message="Generating price forecast..." tone="muted" icon="loading" className="mb-3" />
            )}
            {convertedCandles && convertedCandles.candles.length > 0 ? (
              <LiveCandlestickChart
                ref={chartHandleRef}
                candles={convertedCandles.candles}
                livePrice={range === "1d" ? convert(quote?.price ?? null, nativeCurrency) : null}
                supportLevels={convertedSupport}
                resistanceLevels={convertedResistance}
                prediction={prediction}
                theme={theme}
                showMovingAverages={showMA}
                showBollinger={showBB}
                forecast={convertedForecast}
                showForecast={showPricePredictor}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                {isLoadingCandles ? (
                  <StatusBanner message="Loading chart data..." tone="muted" icon="loading" />
                ) : (
                  <p className="text-sm text-ink-faint">No chart data available for this symbol.</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
