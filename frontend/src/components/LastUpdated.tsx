"use client";

import { Radio } from "lucide-react";

import { useNow } from "@/hooks/useNow";
import { cn, timeAgo } from "@/lib/utils";

interface LastUpdatedProps {
  updatedAt: string | null;
  isStale?: boolean;
  className?: string;
  /** Shows a small pulsing live dot next to the timestamp. */
  live?: boolean;
}

export function LastUpdated({ updatedAt, isStale, className, live }: LastUpdatedProps) {
  // Re-renders every second purely to keep "Xs ago" accurate - doesn't refetch anything.
  useNow(1000);

  if (!updatedAt) {
    return <span className={cn("text-xs text-ink-faint", className)}>Awaiting data...</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        isStale ? "text-warn" : "text-ink-faint",
        className
      )}
    >
      {live && !isStale && <Radio size={10} className="animate-pulse-soft text-bull" />}
      {isStale ? "Delayed · last updated" : "Updated"} {timeAgo(updatedAt)}
    </span>
  );
}
