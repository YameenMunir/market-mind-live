"use client";

import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  createChart,
} from "lightweight-charts";

import { bollingerBands, sma } from "@/charts/indicatorMath";
import type { Candle, PredictionResult } from "@/types";

interface LiveCandlestickChartProps {
  candles: Candle[];
  supportLevels: number[];
  resistanceLevels: number[];
  prediction: PredictionResult | null;
  theme: "dark" | "light";
  showMovingAverages: boolean;
  showBollinger: boolean;
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
  },
};

export function LiveCandlestickChart({
  candles,
  supportLevels,
  resistanceLevels,
  prediction,
  theme,
  showMovingAverages,
  showBollinger,
}: LiveCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[]>([]);
  const [isReady, setIsReady] = useState(false);

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
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false },
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

    const sma20Series = chart.addLineSeries({ color: colors.sma20, lineWidth: 2, title: "SMA 20" });
    const sma50Series = chart.addLineSeries({ color: colors.sma50, lineWidth: 2, title: "SMA 50" });
    const bbUpper = chart.addLineSeries({ color: colors.bollinger, lineWidth: 1, title: "BB Upper" });
    const bbLower = chart.addLineSeries({ color: colors.bollinger, lineWidth: 1, title: "BB Lower" });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    sma20SeriesRef.current = sma20Series;
    sma50SeriesRef.current = sma50Series;
    bbUpperRef.current = bbUpper;
    bbLowerRef.current = bbLower;
    setIsReady(true);

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

    supportLevels.forEach((level) => {
      const line = candleSeriesRef.current!.createPriceLine({
        price: level,
        color: THEME_COLORS[theme].up,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Support",
      });
      priceLinesRef.current.push(line);
    });

    resistanceLevels.forEach((level) => {
      const line = candleSeriesRef.current!.createPriceLine({
        price: level,
        color: THEME_COLORS[theme].down,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Resistance",
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

    chartRef.current?.timeScale().fitContent();
  }, [candles, isReady, showMovingAverages, showBollinger, supportLevels, resistanceLevels, prediction, theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
