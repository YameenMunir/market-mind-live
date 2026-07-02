import type { IndicatorSet } from "@/types";

export type InsightTone = "bull" | "bear" | "warn" | "neutral" | "muted";

export interface IndicatorInsight {
  key: string;
  label: string;
  value: string;
  badge: string;
  tone: InsightTone;
  note: string;
}

export interface SupportResistanceInsight {
  note: string;
  tone: InsightTone;
}

export interface TechnicalRead {
  insights: IndicatorInsight[];
  support: SupportResistanceInsight;
  resistance: SupportResistanceInsight;
  summary: string;
  summaryTone: InsightTone;
}

const UNAVAILABLE = "Data unavailable";

function fmt(v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined ? "--" : v.toFixed(digits);
}

/** Pure, reusable interpretation layer over a raw `IndicatorSet` - every indicator's
 * badge/tone/note is derived from that asset's actual numbers (and current price for
 * anything relative, like moving averages or Bollinger position). No per-asset
 * hardcoding: swap in a different `IndicatorSet`/`price` and every line changes. */
export function buildTechnicalRead(indicators: IndicatorSet | null, price: number | null): TechnicalRead {
  const insights: IndicatorInsight[] = [];
  const directionalVotes: number[] = [];

  // --- RSI ---------------------------------------------------------------
  const rsi = indicators?.rsi_14 ?? null;
  if (rsi == null) {
    insights.push({
      key: "rsi",
      label: "RSI (14)",
      value: UNAVAILABLE,
      badge: UNAVAILABLE,
      tone: "muted",
      note: "Not enough price history to calculate RSI yet.",
    });
  } else {
    let badge: string;
    let tone: InsightTone;
    let note: string;
    if (rsi >= 70) {
      badge = "Overbought";
      tone = "bear";
      note = `RSI is at ${rsi.toFixed(1)}, in overbought territory (above 70) - momentum may be stretched and vulnerable to a pullback.`;
      directionalVotes.push(-1);
    } else if (rsi >= 55) {
      badge = "Mild Bullish";
      tone = "bull";
      note = `RSI is at ${rsi.toFixed(1)}, showing moderate buying momentum below the overbought zone.`;
      directionalVotes.push(1);
    } else if (rsi > 45) {
      badge = "Neutral";
      tone = "neutral";
      note = `RSI is at ${rsi.toFixed(1)}, in a neutral range with no strong momentum bias either way.`;
      directionalVotes.push(0);
    } else if (rsi > 30) {
      badge = "Mild Bearish";
      tone = "bear";
      note = `RSI is at ${rsi.toFixed(1)}, showing moderate selling pressure above the oversold zone.`;
      directionalVotes.push(-1);
    } else {
      badge = "Oversold";
      tone = "bull";
      note = `RSI is at ${rsi.toFixed(1)}, in oversold territory (below 30) - selling may be stretched and could see a bounce.`;
      directionalVotes.push(1);
    }
    insights.push({ key: "rsi", label: "RSI (14)", value: rsi.toFixed(1), badge, tone, note });
  }

  // --- Moving averages -----------------------------------------------------
  const ma = indicators?.moving_averages;
  const smaRow = (key: "sma_20" | "sma_50" | "sma_200", label: string, horizon: string) => {
    const sma = ma?.[key] ?? null;
    if (sma == null) {
      insights.push({
        key,
        label,
        value: UNAVAILABLE,
        badge: UNAVAILABLE,
        tone: "muted",
        note: `Not enough price history to calculate the ${horizon} average yet.`,
      });
      return;
    }
    if (price == null) {
      insights.push({
        key,
        label,
        value: sma.toFixed(2),
        badge: "Awaiting price",
        tone: "muted",
        note: "Waiting for the latest live price to compare against this average.",
      });
      return;
    }
    const above = price > sma;
    directionalVotes.push(above ? 1 : -1);
    insights.push({
      key,
      label,
      value: sma.toFixed(2),
      badge: above ? "Bullish" : "Bearish",
      tone: above ? "bull" : "bear",
      note: `Price is ${above ? "above" : "below"} its ${horizon} average, a ${above ? "bullish" : "bearish"} ${
        horizon === "200-period" ? "signal for the longer-term trend" : "short/medium-term trend signal"
      }.`,
    });
  };
  smaRow("sma_20", "SMA 20", "20-period");
  smaRow("sma_50", "SMA 50", "50-period");
  smaRow("sma_200", "SMA 200", "200-period");

  // --- EMA 12/26 -----------------------------------------------------------
  const ema12 = ma?.ema_12 ?? null;
  const ema26 = ma?.ema_26 ?? null;
  if (ema12 == null || ema26 == null) {
    insights.push({
      key: "ema",
      label: "EMA 12 / 26",
      value: UNAVAILABLE,
      badge: UNAVAILABLE,
      tone: "muted",
      note: "Not enough price history to calculate the EMAs yet.",
    });
  } else {
    const bullish = ema12 > ema26;
    directionalVotes.push(bullish ? 1 : -1);
    insights.push({
      key: "ema",
      label: "EMA 12 / 26",
      value: `${ema12.toFixed(2)} / ${ema26.toFixed(2)}`,
      badge: bullish ? "Bullish Momentum" : "Bearish Momentum",
      tone: bullish ? "bull" : "bear",
      note: `EMA 12 is ${bullish ? "above" : "below"} EMA 26. EMAs react faster to recent prices than SMAs, so this reflects ${
        bullish ? "building short-term bullish" : "building short-term bearish"
      } momentum.`,
    });
  }

  // --- MACD histogram --------------------------------------------------------
  const macdHist = indicators?.macd.histogram ?? null;
  if (macdHist == null) {
    insights.push({
      key: "macd",
      label: "MACD Histogram",
      value: UNAVAILABLE,
      badge: UNAVAILABLE,
      tone: "muted",
      note: "Not enough price history to calculate MACD yet.",
    });
  } else {
    const threshold = price ? price * 0.0005 : 0.01;
    let badge: string;
    let tone: InsightTone;
    let note: string;
    if (macdHist > threshold) {
      badge = "Bullish Momentum";
      tone = "bull";
      note = `A positive MACD histogram of ${macdHist.toFixed(3)} suggests upward momentum is currently stronger than downward pressure.`;
      directionalVotes.push(1);
    } else if (macdHist < -threshold) {
      badge = "Bearish Momentum";
      tone = "bear";
      note = `A negative MACD histogram of ${macdHist.toFixed(3)} suggests downward momentum is currently stronger than upward pressure.`;
      directionalVotes.push(-1);
    } else {
      badge = "Weak / Unclear";
      tone = "neutral";
      note = `MACD histogram is close to zero (${macdHist.toFixed(3)}), meaning momentum is weak or transitioning - not a strong signal either way.`;
      directionalVotes.push(0);
    }
    insights.push({ key: "macd", label: "MACD Histogram", value: macdHist.toFixed(3), badge, tone, note });
  }

  // --- Bollinger Bands ---------------------------------------------------------
  const bbUpper = indicators?.bollinger_bands.upper ?? null;
  const bbLower = indicators?.bollinger_bands.lower ?? null;
  if (bbUpper == null || bbLower == null) {
    insights.push({
      key: "bollinger",
      label: "Bollinger Bands",
      value: UNAVAILABLE,
      badge: UNAVAILABLE,
      tone: "muted",
      note: "Not enough price history to calculate Bollinger Bands yet.",
    });
  } else {
    const value = `${bbLower.toFixed(2)} - ${bbUpper.toFixed(2)}`;
    if (price == null) {
      insights.push({
        key: "bollinger",
        label: "Bollinger Bands",
        value,
        badge: "Awaiting price",
        tone: "muted",
        note: "Waiting for the latest live price to gauge its position within the bands.",
      });
    } else {
      const width = bbUpper - bbLower;
      const position = width > 0 ? (price - bbLower) / width : 0.5;
      const widthPct = price > 0 ? (width / price) * 100 : 0;
      let badge: string;
      let tone: InsightTone;
      let positionNote: string;
      if (position >= 0.85) {
        badge = "Near Upper Band";
        tone = "warn";
        positionNote = "Price is trading near the upper band - often a sign of strong momentum, but it also raises the chance of a short-term pullback.";
      } else if (position <= 0.15) {
        badge = "Near Lower Band";
        tone = "warn";
        positionNote = "Price is trading near the lower band - often a sign of weakness, but it also raises the chance of a short-term bounce.";
      } else {
        badge = "Mid-Range";
        tone = "neutral";
        positionNote = "Price is trading in the middle of its recent range, without an extreme reading in either direction.";
      }
      const volatilityNote =
        widthPct >= 8
          ? " Bands are relatively wide right now, reflecting higher volatility."
          : widthPct <= 3
          ? " Bands are relatively narrow right now, reflecting lower volatility (which can precede a bigger move)."
          : "";
      insights.push({ key: "bollinger", label: "Bollinger Bands", value, badge, tone, note: positionNote + volatilityNote });
    }
  }

  // --- ATR ---------------------------------------------------------------------
  const atr = indicators?.atr_14 ?? null;
  if (atr == null) {
    insights.push({
      key: "atr",
      label: "ATR (14)",
      value: UNAVAILABLE,
      badge: UNAVAILABLE,
      tone: "muted",
      note: "Not enough price history to calculate ATR yet.",
    });
  } else if (!price) {
    insights.push({
      key: "atr",
      label: "ATR (14)",
      value: atr.toFixed(3),
      badge: "Awaiting price",
      tone: "muted",
      note: "ATR measures typical daily price movement, not direction - it should not be read as bullish or bearish by itself.",
    });
  } else {
    const atrPct = (atr / price) * 100;
    const badge = atrPct >= 3 ? "High Volatility" : atrPct >= 1 ? "Moderate Volatility" : "Low Volatility";
    const tone: InsightTone = atrPct >= 3 ? "warn" : "neutral";
    insights.push({
      key: "atr",
      label: "ATR (14)",
      value: atr.toFixed(3),
      badge,
      tone,
      note: `The asset typically swings about ${atrPct.toFixed(1)}% per day recently. ATR measures volatility, not direction - it should not be read as bullish or bearish by itself.`,
    });
  }

  // --- Support / resistance ------------------------------------------------------
  const supportLevels = indicators?.support_resistance.support ?? [];
  const resistanceLevels = indicators?.support_resistance.resistance ?? [];
  const nearestBelow = price != null ? supportLevels.filter((v) => v <= price).sort((a, b) => b - a)[0] : undefined;
  const nearestAbove = price != null ? resistanceLevels.filter((v) => v >= price).sort((a, b) => a - b)[0] : undefined;

  const support: SupportResistanceInsight =
    supportLevels.length === 0
      ? { note: "No recent support levels detected in the current lookback window.", tone: "muted" }
      : {
          tone: "bull",
          note:
            nearestBelow != null
              ? `Support marks price zones where buying pressure has emerged historically. The closest is ${nearestBelow.toFixed(2)}, below the current price.`
              : "Support marks price zones where buying pressure has emerged historically.",
        };

  const resistance: SupportResistanceInsight =
    resistanceLevels.length === 0
      ? { note: "No recent resistance levels detected in the current lookback window.", tone: "muted" }
      : {
          tone: "bear",
          note:
            nearestAbove != null
              ? `Resistance marks price zones where selling pressure has emerged historically. The closest is ${nearestAbove.toFixed(2)}, above the current price.`
              : "Resistance marks price zones where selling pressure has emerged historically.",
        };

  // --- Overall technical read ------------------------------------------------------
  if (!indicators) {
    return {
      insights,
      support,
      resistance,
      summary: "Technical data hasn't loaded yet for this asset.",
      summaryTone: "muted",
    };
  }

  const bullishVotes = directionalVotes.filter((v) => v > 0).length;
  const bearishVotes = directionalVotes.filter((v) => v < 0).length;
  const mixed = bullishVotes > 0 && bearishVotes > 0;
  const net = bullishVotes - bearishVotes;

  let summaryTone: InsightTone;
  let headline: string;
  if (net > 1 && !mixed) {
    summaryTone = "bull";
    headline = "The asset is showing broadly bullish technical conditions";
  } else if (net > 0) {
    summaryTone = "bull";
    headline = "The asset is showing mild bullish momentum";
  } else if (net < -1 && !mixed) {
    summaryTone = "bear";
    headline = "The asset is showing broadly bearish technical conditions";
  } else if (net < 0) {
    summaryTone = "bear";
    headline = "The asset is showing mild bearish pressure";
  } else {
    summaryTone = "neutral";
    headline = "The asset's technical signals are balanced, with no clear directional edge right now";
  }

  const rsiInsight = insights.find((i) => i.key === "rsi");
  const macdInsight = insights.find((i) => i.key === "macd");
  const maAboveCount = ["sma_20", "sma_50", "sma_200"].filter(
    (k) => insights.find((i) => i.key === k)?.tone === "bull"
  ).length;
  const maBelowCount = ["sma_20", "sma_50", "sma_200"].filter(
    (k) => insights.find((i) => i.key === k)?.tone === "bear"
  ).length;

  const parts = [headline];
  if (rsiInsight && rsiInsight.tone !== "muted") parts.push(`RSI is ${rsiInsight.badge.toLowerCase()}`);
  if (macdInsight && macdInsight.tone !== "muted") parts.push(`MACD is ${macdInsight.badge.toLowerCase()}`);
  if (maAboveCount || maBelowCount) {
    parts.push(
      maAboveCount > maBelowCount
        ? "price is above most of its key moving averages"
        : maBelowCount > maAboveCount
        ? "price is below most of its key moving averages"
        : "price is straddling its key moving averages"
    );
  }
  let summary = parts.join(", ") + ".";
  if (mixed) {
    summary += " Not every reading agrees, though - treat this as a mixed picture rather than a clean trend.";
  }
  if (resistance.tone === "bear" && (net >= 0 || mixed)) {
    summary += " Watch resistance levels above if the move continues.";
  } else if (support.tone === "bull" && (net <= 0 || mixed)) {
    summary += " Watch support levels below if selling continues.";
  }

  return { insights, support, resistance, summary, summaryTone };
}
