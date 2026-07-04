import { useMemo } from "react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { buildTechnicalRead, type InsightTone } from "@/lib/indicatorInsights";
import { cn, formatPrice } from "@/lib/utils";
import type { IndicatorSet } from "@/types";

interface IndicatorPanelProps {
  indicators: IndicatorSet | null;
  price?: number | null;
  updatedAt?: string | null;
  isLive?: boolean;
  isStale?: boolean;
  /** Currency the underlying indicator/price values are denominated in. */
  nativeCurrency?: string;
}

const TONE_TEXT: Record<InsightTone, string> = {
  bull: "text-bull",
  bear: "text-bear",
  warn: "text-warn",
  neutral: "text-ink-muted",
  muted: "text-ink-faint",
};

const TONE_BADGE: Record<InsightTone, string> = {
  bull: "bg-bull/15 text-bull",
  bear: "bg-bear/15 text-bear",
  warn: "bg-warn/15 text-warn",
  neutral: "bg-surface-raised text-ink-muted",
  muted: "bg-surface-raised text-ink-faint",
};

const TONE_SUMMARY_BOX: Record<InsightTone, string> = {
  bull: "border-bull/25 bg-bull/5",
  bear: "border-bear/25 bg-bear/5",
  warn: "border-warn/25 bg-warn/5",
  neutral: "border-border bg-surface-raised",
  muted: "border-border bg-surface-raised",
};

export function IndicatorPanel({
  indicators,
  price,
  updatedAt,
  isLive,
  isStale,
  nativeCurrency = "USD",
}: IndicatorPanelProps) {
  const { currency, convert } = useCurrencyContext();

  // Every price-scale field (moving averages, MACD, Bollinger bands, ATR, support/
  // resistance) gets scaled by the same FX factor before interpretation - the badges/
  // tones in buildTechnicalRead only ever compare relative magnitudes, so this changes
  // the displayed numbers without touching any bullish/bearish logic. RSI (0-100) is
  // left untouched since it isn't price-denominated.
  const convertedIndicators = useMemo<IndicatorSet | null>(() => {
    if (!indicators) return null;
    if (nativeCurrency === currency) return indicators;
    const c = (v: number | null) => (v == null ? null : convert(v, nativeCurrency));
    return {
      ...indicators,
      moving_averages: {
        sma_20: c(indicators.moving_averages.sma_20),
        sma_50: c(indicators.moving_averages.sma_50),
        sma_200: c(indicators.moving_averages.sma_200),
        ema_12: c(indicators.moving_averages.ema_12),
        ema_26: c(indicators.moving_averages.ema_26),
      },
      macd: {
        macd_line: c(indicators.macd.macd_line),
        signal_line: c(indicators.macd.signal_line),
        histogram: c(indicators.macd.histogram),
      },
      bollinger_bands: {
        upper: c(indicators.bollinger_bands.upper),
        middle: c(indicators.bollinger_bands.middle),
        lower: c(indicators.bollinger_bands.lower),
      },
      support_resistance: {
        support: indicators.support_resistance.support.map((v) => convert(v, nativeCurrency) ?? v),
        resistance: indicators.support_resistance.resistance.map((v) => convert(v, nativeCurrency) ?? v),
      },
      atr_14: c(indicators.atr_14),
    };
  }, [indicators, currency, nativeCurrency, convert]);

  const convertedPrice = price == null ? null : convert(price, nativeCurrency);
  const read = buildTechnicalRead(convertedIndicators, convertedPrice ?? null);

  return (
    <Panel eyebrow="Technical Indicators" title="Signal Breakdown">
      <div className="divide-y divide-border">
        {read.insights.map((insight) => (
          <div key={insight.key} className="py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-muted">{insight.label}</span>
              <span className={cn("numeric font-mono text-sm font-medium", TONE_TEXT[insight.tone])}>{insight.value}</span>
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-2">
              <p className="text-[11px] leading-relaxed text-ink-faint">{insight.note}</p>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  TONE_BADGE[insight.tone]
                )}
              >
                {insight.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Support</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {convertedIndicators?.support_resistance.support.length ? (
              convertedIndicators.support_resistance.support.map((v, i) => (
                <span key={i} className="numeric font-mono text-xs text-bull">
                  {formatPrice(v, currency)}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-faint">--</span>
            )}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">{read.support.note}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Resistance</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {convertedIndicators?.support_resistance.resistance.length ? (
              convertedIndicators.support_resistance.resistance.map((v, i) => (
                <span key={i} className="numeric font-mono text-xs text-bear">
                  {formatPrice(v, currency)}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-faint">--</span>
            )}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">{read.resistance.note}</p>
        </div>
      </div>

      <div className={cn("mt-3 rounded-xl border p-3", TONE_SUMMARY_BOX[read.summaryTone])}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Overall Technical Read</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{read.summary}</p>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
