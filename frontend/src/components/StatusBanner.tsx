import { AlertTriangle, Clock, Loader2, MoonStar, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusTone = "info" | "warning" | "error" | "muted";

interface StatusBannerProps {
  message: string;
  tone?: StatusTone;
  icon?: "loading" | "clock" | "moon" | "warning" | "offline";
  className?: string;
}

// Fill tint alpha matches Badge.tsx's TONE_STYLES for the same reason - see the
// comment there. `info` keeps a stronger tint since brand-strong has the contrast
// headroom to spare; `warning`/`error` don't.
const TONE_STYLES: Record<StatusTone, string> = {
  info: "border-brand/40 bg-brand/5 text-brand",
  warning: "border-warn/40 bg-warn/5 text-warn",
  error: "border-bear/40 bg-bear/5 text-bear",
  muted: "border-border bg-surface text-ink-muted",
};

const ICONS = {
  loading: Loader2,
  clock: Clock,
  moon: MoonStar,
  warning: AlertTriangle,
  offline: WifiOff,
};

export function StatusBanner({ message, tone = "muted", icon = "clock", className }: StatusBannerProps) {
  const Icon = ICONS[icon];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-center gap-2 rounded-sm border px-3 py-2 text-xs font-mono font-medium tracking-wide", TONE_STYLES[tone], className)}
    >
      <Icon size={14} aria-hidden className={cn("shrink-0", icon === "loading" && "animate-spin")} />
      <span>{message}</span>
    </div>
  );
}
