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

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-ink-muted",
  bull: "bg-bull/15 text-bull",
  bear: "bg-bear/15 text-bear",
  warn: "bg-warn/15 text-warn",
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
