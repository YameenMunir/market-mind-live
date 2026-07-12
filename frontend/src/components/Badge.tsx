import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "bull" | "bear" | "warn" | "brand";
export type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  uppercase?: boolean;
  className?: string;
}

// bull/bear/warn text sits on a tint of the *same* color - the composited background
// is a blend toward that color, not a fixed neutral surface, so it needs a lower tint
// alpha than intuition suggests to keep 4.5:1: text-vs-surface contrast degrades as
// the tint gets stronger. Verified against light theme (the tighter of the two) with
// an automated contrast scan - /15 measured 3.9-4.2:1 (fails AA), /6 measures
// 4.5-4.8:1 (passes with margin) for all three. brand-strong has enough headroom on
// its own to stay at /15.
const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "border border-border bg-surface-raised text-ink-muted",
  bull: "border border-bull/30 bg-bull/5 text-bull",
  bear: "border border-bear/30 bg-bear/5 text-bear",
  warn: "border border-warn/30 bg-warn/5 text-warn",
  brand: "border border-brand/35 bg-brand/5 text-brand",
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-2xs",
  md: "px-2 py-0.5 text-2xs",
};

/** Standard status/signal/tone chip - consolidates what used to be a slightly different
 * hand-rolled `<span className="rounded-full ...">` per component. */
export function Badge({ children, tone = "neutral", size = "md", uppercase = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-sm font-mono font-bold leading-none uppercase tracking-wider",
        TONE_STYLES[tone],
        SIZE_STYLES[size],
        className
      )}
    >
      {children}
    </span>
  );
}
