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
    <Panel eyebrow="Model Prediction" title={prediction ? `${prediction.horizon}` : isLoading ? "Analyzing..." : "--"}>
      <div className="flex items-center justify-between gap-4">
        {prediction ? (
          <div>
            <div className={cn("flex items-center gap-2 text-lg font-semibold", meta?.color ?? "text-ink-muted")}>
              <Icon size={20} />
              {meta?.label ?? "--"}
            </div>
            {prediction.target_price && (
              <p className="mt-2 text-xs text-ink-muted">
                Indicative target:{" "}
                <span className="numeric font-medium text-ink">
                  {formatPrice(convert(prediction.target_price, nativeCurrency), currency)}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div aria-hidden className="animate-pulse">
            <div className="h-5 w-24 rounded bg-surface-raised" />
            <div className="mt-2.5 h-3 w-32 rounded bg-surface-raised" />
          </div>
        )}
        {prediction ? (
          <ConfidenceMeter confidence={prediction.confidence} />
        ) : (
          <div aria-hidden className="h-[100px] w-[100px] shrink-0 animate-pulse rounded-full border-[7px] border-surface-raised" />
        )}
      </div>
      <div className="mt-4">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
