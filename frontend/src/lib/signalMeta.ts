import type { BadgeTone } from "@/components/Badge";

export const SIGNAL_META: Record<string, { label: string; tone: BadgeTone }> = {
  buy: { label: "Buy signal", tone: "bull" },
  sell: { label: "Sell signal", tone: "bear" },
  hold: { label: "Hold signal", tone: "warn" },
};
