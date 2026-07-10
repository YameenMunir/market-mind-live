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
  neutral: "bg-surface-raised text-ink-muted",
  bull: "bg-bull/6 text-bull",
  bear: "bg-bear/6 text-bear",
  warn: "bg-warn/6 text-warn",
  brand: "bg-brand/15 text-brand-strong",
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-[11px]",
};

/** Standard status/signal/tone chip - consolidates what used to be a slightly different
 * hand-rolled `<span className="rounded-full ...">` per component. */
export function Badge({ children, tone = "neutral", size = "md", uppercase = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold leading-none",
        uppercase && "uppercase tracking-wide",
        TONE_STYLES[tone],
        SIZE_STYLES[size],
        className
      )}
    >
      {children}
    </span>
  );
}
