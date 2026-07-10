import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PredictionResult } from "@/types";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading?: boolean;
  updatedAt?: string | null;
  isLive?: boolean;
  isStale?: boolean;
  /** Currency the underlying quote/target price is denominated in (e.g. `quote.currency`). */
  nativeCurrency?: string;
}

const DIRECTION_META = {
  bullish: { label: "Bullish", icon: TrendingUp, color: "text-bull" },
  bearish: { label: "Bearish", icon: TrendingDown, color: "text-bear" },
  neutral: { label: "Neutral", icon: Minus, color: "text-ink-muted" },
} as const;

export function PredictionCard({
  prediction,
  isLoading,
  updatedAt,
  isLive,
  isStale,
  nativeCurrency = "USD",
}: PredictionCardProps) {
  const meta = prediction ? DIRECTION_META[prediction.direction] : null;
  const Icon = meta?.icon ?? Minus;
  const { currency, convert } = useCurrencyContext();

  return (
    <Panel
      eyebrow="Model Prediction"
      title={prediction ? `${prediction.horizon}` : isLoading ? "Analyzing..." : "--"}
      className="flex h-full flex-col justify-between"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {prediction ? (
          <div className="min-w-0">
            <div className={cn("inline-flex items-center gap-2 rounded-sm border px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider", meta?.color === "text-bull" ? "border-bull/20 bg-bull/5 text-bull" : meta?.color === "text-bear" ? "border-bear/20 bg-bear/5 text-bear" : "border-border bg-surface-raised text-ink-muted")}>
              <Icon size={14} className="shrink-0" />
              <span className="truncate">{meta?.label ?? "--"}</span>
            </div>
            {prediction.target_price && (
              <p className="mt-2.5 break-words font-mono text-xs text-ink-muted">
                Target:{" "}
                <span className="numeric font-bold text-ink">
                  {formatPrice(convert(prediction.target_price, nativeCurrency), currency)}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div aria-hidden className="min-w-0 animate-pulse">
            <div className="h-5 w-24 rounded-sm bg-surface-raised" />
            <div className="mt-2.5 h-3 w-32 rounded-sm bg-surface-raised" />
          </div>
        )}
        {prediction ? (
          <ConfidenceMeter confidence={prediction.confidence} />
        ) : (
          <div aria-hidden className="flex flex-col gap-1.5 min-w-[110px] shrink-0 animate-pulse">
            <div className="h-3 w-16 rounded bg-surface-raised" />
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-3.5 w-2 rounded-sm bg-surface-raised" />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
