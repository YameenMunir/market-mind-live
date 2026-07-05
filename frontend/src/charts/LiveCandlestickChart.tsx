"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  createChart,
} from "lightweight-charts";

import { bollingerBands, sma } from "@/charts/indicatorMath";
import type { Candle, ForecastPoint, PredictionResult, PriceForecast } from "@/types";

interface LiveCandlestickChartProps {
  candles: Candle[];
  /** Latest live quote price - when set, ticks the last bar's close/high/low in place
   * via `series.update()` between full candle refreshes, so the chart visibly tracks
   * the live price without a full redraw (no reset zoom/pan, no flicker). */
  livePrice?: number | null;
  supportLevels: number[];
  resistanceLevels: number[];
  prediction: PredictionResult | null;
  theme: "dark" | "light";
  showMovingAverages: boolean;
  showBollinger: boolean;
  /** Multi-day statistical forecast (services/prediction_service.py) - rendered as a
   * dashed continuation line plus dotted confidence-band lines when `showForecast` is on. */
  forecast: PriceForecast | null;
  showForecast: boolean;
}

export interface LiveCandlestickChartHandle {
  /** Re-fits the visible time range to all loaded candles - lets a parent offer a
   * "Reset zoom" control without the chart needing to expose its internal chart/series refs. */
  fitContent: () => void;
  /** Returns a PNG data URL of the current chart canvas, or null if the chart isn't ready. */
  takeScreenshot: () => string | null;
}

const THEME_COLORS = {
  dark: {
    background: "#0d1018",
    text: "#9ca6b6",
    grid: "#1a2030",
    border: "#20263480",
    up: "#2dd4bf",
    down: "#f43f5e",
    sma20: "#f5a623",
    sma50: "#60a5fa",
    bollinger: "#9ca6b64d",
    forecastLine: "#a78bfa",
    forecastBand: "#a78bfa66",
  },
  light: {
    background: "#ffffff",
    text: "#5b606b",
    grid: "#eeeeea",
    border: "#e2e2dc80",
    up: "#0d9488",
    down: "#dc2626",
    sma20: "#c47a0c",
    sma50: "#2563eb",
    bollinger: "#5b606b33",
    forecastLine: "#7c3aed",
    forecastBand: "#7c3aed4d",
  },
};

function toUnixSeconds(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
}

export const LiveCandlestickChart = forwardRef<LiveCandlestickChartHandle, LiveCandlestickChartProps>(
  function LiveCandlestickChart(
    {
      candles,
      livePrice,
      supportLevels,
      resistanceLevels,
      prediction,
      theme,
      showMovingAverages,
      showBollinger,
      forecast,
      showForecast,
    },
    ref
  ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  const forecastLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const forecastUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const forecastLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[]>([]);
  const lastBaseCandleRef = useRef<{ time: Time; open: number; high: number; low: number } | null>(null);
  const hasFitContentRef = useRef(false);
  // Maps a forecast point's Unix-seconds date to its full ForecastPoint, so the
  // crosshair-move handler (registered once, on mount) can look up hover details without
  // needing to be re-subscribed every time the `forecast` prop changes.
  const forecastMapRef = useRef<Map<number, ForecastPoint>>(new Map());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    forecastMapRef.current =
      showForecast && forecast ? new Map(forecast.points.map((p) => [toUnixSeconds(p.date), p])) : new Map();
  }, [forecast, showForecast]);

  useEffect(() => {
    if (!containerRef.current) return;
    const colors = THEME_COLORS[theme];

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontFamily: "var(--font-jetbrains-mono)",
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false, rightOffset: 10 },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: colors.up,
      downColor: colors.down,
      borderVisible: false,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: colors.up,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    // No title text and lastValueVisible/priceLineVisible off for overlay series - an axis
    // badge per series (SMA20/SMA50/BB upper/lower) stacks up and collides with the
    // support/resistance labels when values sit close together. Colors + the legend
    // checkboxes below the chart identify each line instead; crosshair tooltip still
    // shows exact values on hover.
    const overlaySeriesOptions = { lastValueVisible: false, priceLineVisible: false } as const;
    const sma20Series = chart.addLineSeries({ color: colors.sma20, lineWidth: 2, ...overlaySeriesOptions });
    const sma50Series = chart.addLineSeries({ color: colors.sma50, lineWidth: 2, ...overlaySeriesOptions });
    const bbUpper = chart.addLineSeries({ color: colors.bollinger, lineWidth: 1, ...overlaySeriesOptions });
    const bbLower = chart.addLineSeries({ color: colors.bollinger, lineWidth: 1, ...overlaySeriesOptions });

    const forecastLine = chart.addLineSeries({
      color: colors.forecastLine,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      ...overlaySeriesOptions,
    });
    const forecastUpper = chart.addLineSeries({
      color: colors.forecastBand,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      ...overlaySeriesOptions,
    });
    const forecastLower = chart.addLineSeries({
      color: colors.forecastBand,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      ...overlaySeriesOptions,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    sma20SeriesRef.current = sma20Series;
    sma50SeriesRef.current = sma50Series;
    bbUpperRef.current = bbUpper;
    bbLowerRef.current = bbLower;
    forecastLineRef.current = forecastLine;
    forecastUpperRef.current = forecastUpper;
    forecastLowerRef.current = forecastLower;
    hasFitContentRef.current = false;
    setIsReady(true);

    // Custom hover tooltip for forecast points - this chart has no other crosshair-move
    // subscription today, so this is purely additive alongside the library's own crosshair.
    chart.subscribeCrosshairMove((param) => {
      const tooltipEl = tooltipRef.current;
      if (!tooltipEl) return;
      const point = param.time !== undefined ? forecastMapRef.current.get(param.time as number) : undefined;
      if (!param.point || !point) {
        tooltipEl.style.display = "none";
        return;
      }
      const dateLabel = new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
      tooltipEl.innerHTML = `
        <div class="font-semibold text-ink">${dateLabel}</div>
        <div class="mt-1 numeric">Predicted: <span class="font-semibold text-ink">${point.predicted_price.toFixed(2)}</span></div>
        <div class="numeric text-ink-muted">Range: ${point.lower_bound.toFixed(2)} - ${point.upper_bound.toFixed(2)}</div>
        <div class="mt-1 text-ink-muted">Confidence: ${Math.round(point.confidence)}%</div>
      `;
      tooltipEl.style.display = "block";
      const container = containerRef.current;
      const containerWidth = container?.clientWidth ?? 0;
      // Flip to the left of the cursor near the right edge so the tooltip never clips
      // outside the chart container.
      const showLeft = param.point.x > containerWidth - 160;
      tooltipEl.style.left = showLeft ? "" : `${param.point.x + 14}px`;
      tooltipEl.style.right = showLeft ? `${containerWidth - param.point.x + 14}px` : "";
      tooltipEl.style.top = `${param.point.y + 14}px`;
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      setIsReady(false);
    };
  }, [theme]);

  useEffect(() => {
    if (!isReady || !candleSeriesRef.current || candles.length === 0) return;

    const candleData = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(candleData);

    const lastCandleForLiveTick = candles[candles.length - 1];
    lastBaseCandleRef.current = lastCandleForLiveTick
      ? {
          time: lastCandleForLiveTick.time as Time,
          open: lastCandleForLiveTick.open,
          high: lastCandleForLiveTick.high,
          low: lastCandleForLiveTick.low,
        }
      : null;

    volumeSeriesRef.current?.setData(
      candles.map((c) => ({
        time: c.time as Time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? THEME_COLORS[theme].up + "80" : THEME_COLORS[theme].down + "80",
      }))
    );

    if (showMovingAverages) {
      sma20SeriesRef.current?.setData(sma(candles, 20));
      sma50SeriesRef.current?.setData(sma(candles, 50));
    } else {
      sma20SeriesRef.current?.setData([]);
      sma50SeriesRef.current?.setData([]);
    }

    if (showBollinger) {
      const bands = bollingerBands(candles, 20, 2);
      bbUpperRef.current?.setData(bands.upper);
      bbLowerRef.current?.setData(bands.lower);
    } else {
      bbUpperRef.current?.setData([]);
      bbLowerRef.current?.setData([]);
    }

    priceLinesRef.current.forEach((line) => candleSeriesRef.current?.removePriceLine(line));
    priceLinesRef.current = [];

    // Only the level closest to the last price gets an axis label - drawing every
    // support/resistance line with its own badge crowds the price axis and the labels
    // collide when levels sit close together. The rest still render as dashed zone
    // lines (visible on the chart) without a badge; the full list stays in the panel below.
    const lastPrice = candles[candles.length - 1]?.close;
    const nearestLevel = (levels: number[]) =>
      levels.length === 0 || lastPrice === undefined
        ? null
        : levels.reduce((closest, level) => (Math.abs(level - lastPrice) < Math.abs(closest - lastPrice) ? level : closest));

    const nearestSupport = nearestLevel(supportLevels);
    const nearestResistance = nearestLevel(resistanceLevels);

    supportLevels.forEach((level) => {
      const line = candleSeriesRef.current!.createPriceLine({
        price: level,
        color: THEME_COLORS[theme].up,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: level === nearestSupport,
        title: level === nearestSupport ? "S" : "",
      });
      priceLinesRef.current.push(line);
    });

    resistanceLevels.forEach((level) => {
      const line = candleSeriesRef.current!.createPriceLine({
        price: level,
        color: THEME_COLORS[theme].down,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: level === nearestResistance,
        title: level === nearestResistance ? "R" : "",
      });
      priceLinesRef.current.push(line);
    });

    if (prediction && prediction.direction !== "neutral" && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const marker: SeriesMarker<Time> = {
        time: lastCandle.time as Time,
        position: prediction.direction === "bullish" ? "belowBar" : "aboveBar",
        color: prediction.direction === "bullish" ? THEME_COLORS[theme].up : THEME_COLORS[theme].down,
        shape: prediction.direction === "bullish" ? "arrowUp" : "arrowDown",
        text: `${prediction.direction === "bullish" ? "Bullish" : "Bearish"} ${Math.round(prediction.confidence)}%`,
      };
      candleSeriesRef.current.setMarkers([marker]);
    } else {
      candleSeriesRef.current?.setMarkers([]);
    }

    if (showForecast && forecast && forecast.points.length > 0 && candles.length > 0) {
      // Anchor from the last *rendered* candle (not forecast.last_actual_price/date) so the
      // dashed line visually continues from where the solid series ends, staying aligned
      // even if the forecast response was cached slightly earlier than the latest candle poll.
      const lastCandle = candles[candles.length - 1];
      const anchor = { time: lastCandle.time as Time, value: lastCandle.close };

      forecastLineRef.current?.setData([
        anchor,
        ...forecast.points.map((p) => ({ time: toUnixSeconds(p.date) as Time, value: p.predicted_price })),
      ]);
      forecastUpperRef.current?.setData([
        anchor,
        ...forecast.points.map((p) => ({ time: toUnixSeconds(p.date) as Time, value: p.upper_bound })),
      ]);
      forecastLowerRef.current?.setData([
        anchor,
        ...forecast.points.map((p) => ({ time: toUnixSeconds(p.date) as Time, value: p.lower_bound })),
      ]);
    } else {
      forecastLineRef.current?.setData([]);
      forecastUpperRef.current?.setData([]);
      forecastLowerRef.current?.setData([]);
    }

    // Only fit the visible range on the first load - refitting on every subsequent
    // refresh would reset any zoom/pan the user has done, which reads as a jarring
    // "jump" rather than a smooth live update.
    if (!hasFitContentRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasFitContentRef.current = true;
    }
  }, [
    candles,
    isReady,
    showMovingAverages,
    showBollinger,
    supportLevels,
    resistanceLevels,
    prediction,
    theme,
    forecast,
    showForecast,
  ]);

  // Ticks the last bar's close (and high/low if the live price extends them) in place
  // on every quote update, without touching the rest of the series or the viewport.
  useEffect(() => {
    if (!isReady || !candleSeriesRef.current || livePrice === null || livePrice === undefined) return;
    const base = lastBaseCandleRef.current;
    if (!base) return;

    const updatedCandle = {
      time: base.time,
      open: base.open,
      high: Math.max(base.high, livePrice),
      low: Math.min(base.low, livePrice),
      close: livePrice,
    };
    candleSeriesRef.current.update(updatedCandle);
    base.high = updatedCandle.high;
    base.low = updatedCandle.low;
  }, [livePrice, isReady]);

  useImperativeHandle(
    ref,
    () => ({
      fitContent: () => chartRef.current?.timeScale().fitContent(),
      takeScreenshot: () => (chartRef.current ? chartRef.current.takeScreenshot().toDataURL() : null),
    }),
    []
  );

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        ref={tooltipRef}
        aria-hidden
        className="pointer-events-none absolute z-10 rounded-lg border border-border bg-surface-raised/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
        style={{ display: "none" }}
      />
    </div>
  );
  }
);
