import { useMemo } from "react";

import { Badge, type BadgeTone } from "@/components/Badge";
import { InfoTooltip } from "@/components/InfoTooltip";
import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { GLOSSARY_ID_BY_INDICATOR_KEY, SUPPORT_RESISTANCE_GLOSSARY_ID } from "@/lib/indicatorGlossary";
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

const TONE_BADGE: Record<InsightTone, { tone: BadgeTone; className?: string }> = {
  bull: { tone: "bull" },
  bear: { tone: "bear" },
  warn: { tone: "warn" },
  neutral: { tone: "neutral" },
  muted: { tone: "neutral", className: "text-ink-faint" },
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

  if (!indicators) {
    return (
      <Panel eyebrow="Technical Indicators" title="Signal Breakdown">
        <div aria-hidden className="animate-pulse divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="h-3 w-24 rounded-sm bg-surface-raised" />
              <div className="h-3 w-16 rounded-sm bg-surface-raised" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Technical Indicators" title="Signal Breakdown">
      <div className="divide-y divide-border">
        {read.insights.map((insight) => (
          <div key={insight.key} className="py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-ink-muted">
                {insight.label}
                <InfoTooltip articleId={GLOSSARY_ID_BY_INDICATOR_KEY[insight.key]} />
              </span>
              <span className={cn("numeric font-mono text-xs font-semibold", TONE_TEXT[insight.tone])}>{insight.value}</span>
            </div>
            <div className="mt-1 flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-ink-muted">{insight.note}</p>
              <Badge
                size="sm"
                uppercase
                tone={TONE_BADGE[insight.tone].tone}
                className={cn("shrink-0", TONE_BADGE[insight.tone].className)}
              >
                {insight.badge}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div>
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase font-bold tracking-wider text-ink-faint">
            Support
            <InfoTooltip articleId={SUPPORT_RESISTANCE_GLOSSARY_ID} />
          </span>
          <div className="mt-1 flex flex-col gap-0.5">
            {convertedIndicators?.support_resistance.support.length ? (
              convertedIndicators.support_resistance.support.map((v, i) => (
                <span key={i} className="numeric font-mono text-xs font-semibold text-bull">
                  {formatPrice(v, currency)}
                </span>
              ))
            ) : (
              <span className="font-mono text-xs text-ink-faint">--</span>
            )}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">{read.support.note}</p>
        </div>
        <div>
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase font-bold tracking-wider text-ink-faint">
            Resistance
            <InfoTooltip articleId={SUPPORT_RESISTANCE_GLOSSARY_ID} />
          </span>
          <div className="mt-1 flex flex-col gap-0.5">
            {convertedIndicators?.support_resistance.resistance.length ? (
              convertedIndicators.support_resistance.resistance.map((v, i) => (
                <span key={i} className="numeric font-mono text-xs font-semibold text-bear">
                  {formatPrice(v, currency)}
                </span>
              ))
            ) : (
              <span className="font-mono text-xs text-ink-faint">--</span>
            )}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">{read.resistance.note}</p>
        </div>
      </div>

      <div className={cn("mt-3 rounded-sm border p-3", TONE_SUMMARY_BOX[read.summaryTone])}>
        <p className="font-mono text-[9px] uppercase font-bold tracking-wider text-ink-muted">Overall Technical Read</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{read.summary}</p>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
