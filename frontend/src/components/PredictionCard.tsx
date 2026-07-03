import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PredictionResult } from "@/types";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading?: boolean;
  updatedAt?: string | null;
  isLive?: boolean;
  isStale?: boolean;
}

const DIRECTION_META = {
  bullish: { label: "Bullish", icon: TrendingUp, color: "text-bull" },
  bearish: { label: "Bearish", icon: TrendingDown, color: "text-bear" },
  neutral: { label: "Neutral", icon: Minus, color: "text-ink-muted" },
} as const;

export function PredictionCard({ prediction, isLoading, updatedAt, isLive, isStale }: PredictionCardProps) {
  const meta = prediction ? DIRECTION_META[prediction.direction] : null;
  const Icon = meta?.icon ?? Minus;

  return (
    <Panel eyebrow="Model Prediction" title={prediction ? `${prediction.horizon}` : "Analyzing..."}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className={cn("flex items-center gap-2 text-lg font-semibold", meta?.color ?? "text-ink-muted")}>
            <Icon size={20} />
            {meta?.label ?? (isLoading ? "Analyzing" : "--")}
          </div>
          {prediction?.target_price && (
            <p className="mt-2 text-xs text-ink-muted">
              Indicative target: <span className="numeric font-medium text-ink">{formatPrice(prediction.target_price)}</span>
            </p>
          )}
        </div>
        {prediction && <ConfidenceMeter confidence={prediction.confidence} />}
      </div>
      <div className="mt-4">
        <LastUpdated updatedAt={updatedAt ?? null} live={isLive} isStale={isStale} />
      </div>
    </Panel>
  );
}
