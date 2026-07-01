import type { Candle } from "@/types";
import type { LineData, Time } from "lightweight-charts";

export function sma(candles: Candle[], window: number): LineData[] {
  const points: LineData[] = [];
  for (let i = window - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += candles[j].close;
    points.push({ time: candles[i].time as Time, value: sum / window });
  }
  return points;
}

export function bollingerBands(candles: Candle[], window = 20, numStd = 2) {
  const upper: LineData[] = [];
  const lower: LineData[] = [];
  const middle: LineData[] = [];

  for (let i = window - 1; i < candles.length; i++) {
    const slice = candles.slice(i - window + 1, i + 1).map((c) => c.close);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / window;
    const std = Math.sqrt(variance);
    const time = candles[i].time as Time;
    middle.push({ time, value: mean });
    upper.push({ time, value: mean + numStd * std });
    lower.push({ time, value: mean - numStd * std });
  }

  return { upper, middle, lower };
}
