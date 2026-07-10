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
  info: "border-brand/30 bg-brand/10 text-brand-strong",
  warning: "border-warn/30 bg-warn/6 text-warn",
  error: "border-bear/30 bg-bear/6 text-bear",
  muted: "border-border bg-surface-raised text-ink-muted",
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
      className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium", TONE_STYLES[tone], className)}
    >
      <Icon size={14} aria-hidden className={cn("shrink-0", icon === "loading" && "animate-spin")} />
      <span>{message}</span>
    </div>
  );
}
