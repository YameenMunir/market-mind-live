"use client";

import { useRef } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Camera, Minus, Moon, RotateCcw, Sunrise, Sunset, X } from "lucide-react";

import { Button } from "@/components/Button";
import { ChartOverlayToggles } from "@/components/ChartOverlayToggles";
import { Dialog } from "@/components/Dialog";
import { PricePredictorControls } from "@/components/PricePredictorControls";
import { StatusBanner } from "@/components/StatusBanner";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { LiveCandlestickChart, type LiveCandlestickChartHandle } from "@/charts/LiveCandlestickChart";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useCurrencyConvertedChartData } from "@/hooks/useCurrencyConvertedChartData";
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

/** Everything needed to drive the chart's own display controls (timeframe, overlays,
 * price predictor) - one cohesive unit rather than five separate boolean/value +
 * setter pairs, since they're always read and passed down together (dashboard/page.tsx
 * and this component are the two places that need all of them at once). */
export interface ChartControls {
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
}

interface FullscreenChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  assetName?: string | null;
  chartControls: ChartControls;
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
  chartControls: { range, onRangeChange, showMA, onToggleMA, showBB, onToggleBB, showPricePredictor, onTogglePricePredictor, horizonDays, onHorizonChange },
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

  const { convertedCandles, convertedForecast, convertedSupport, convertedResistance } = useCurrencyConvertedChartData({
    candles,
    forecast,
    supportLevels,
    resistanceLevels,
    nativeCurrency,
  });

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
    <Dialog isOpen={isOpen} onClose={onClose} variant="cover" labelledBy="fullscreen-chart-title">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 bg-surface-raised/30">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded border border-border bg-surface-raised px-2 py-0.5 font-mono text-xs font-bold text-ink">
                  {symbol}
                </span>
                {assetName && (
                  <span className="hidden sm:inline text-sm font-medium text-ink-muted truncate max-w-[180px]">
                    {assetName}
                  </span>
                )}
                <span className="rounded-full bg-surface-raised/60 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-ink-faint">
                  {CHART_RANGES.find((r) => r.value === range)?.label}
                </span>
              </div>

              {/* Vertical divider */}
              <div className="hidden sm:block border-r border-border h-4" />

              {quote && (
                <div className="flex items-center gap-2.5">
                  <span className="numeric font-mono text-base font-bold text-ink">
                    {formatPrice(convert(quote.price, nativeCurrency), currency)}
                  </span>
                  <span
                    className={cn(
                      "numeric inline-flex items-center gap-1 font-mono text-xs font-bold px-1.5 py-0.5 rounded-sm border",
                      isFlat 
                        ? "border-border bg-surface-raised text-ink-muted" 
                        : isPositive 
                          ? "border-bull/20 bg-bull/5 text-bull" 
                          : "border-bear/20 bg-bear/5 text-bear"
                    )}
                  >
                    {isFlat ? <Minus size={11} /> : isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    <span>{formatPrice(convert(quote.change, nativeCurrency), currency)}</span>
                    <span>({formatPercent(quote.change_percent)})</span>
                  </span>
                </div>
              )}

              {/* Vertical divider */}
              {sessionMeta && <div className="hidden sm:block border-r border-border h-4" />}

              {sessionMeta && (
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", sessionMeta.dot, sessionMeta.dot.includes("bg-bull") && "animate-pulse")} />
                  <SessionIcon size={13} className="text-ink-faint shrink-0" />
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-ink-muted">{sessionMeta.label}</span>
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              size="icon"
              onClick={onClose}
              aria-label="Close full-screen chart"
              className="shrink-0 shadow-sm border-border hover:border-ink-faint/30"
            >
              <X size={16} />
            </Button>
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
                range={range}
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
    </Dialog>
  );
}
