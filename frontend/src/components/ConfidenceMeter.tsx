"use client";

import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  confidence: number;
}

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const filledCount = Math.round(confidence / 10);
  const colorClass =
    confidence >= 70
      ? "bg-brand border-brand"
      : confidence >= 45
      ? "bg-warn border-warn"
      : "bg-ink-faint border-ink-faint";

  return (
    <div className="flex flex-col gap-1.5 min-w-[110px] shrink-0">
      <div className="flex items-baseline justify-between font-mono">
        <span className="text-2xs font-bold uppercase tracking-wider text-ink-faint">Confidence</span>
        <span className="numeric text-xs font-bold text-ink">{Math.round(confidence)}%</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3.5 w-2 rounded-sm border transition-all duration-300",
              i < filledCount ? colorClass : "border-border bg-surface-raised"
            )}
          />
        ))}
      </div>
    </div>
  );
}
