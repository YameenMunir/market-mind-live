"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { formatCompactNumber, formatPercent, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PriceQuote } from "@/types";

interface PriceCardProps {
  quote: PriceQuote | null;
  symbol: string;
  isLive?: boolean;
  isStale?: boolean;
}

export function PriceCard({ quote, symbol, isLive, isStale }: PriceCardProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const previousPrice = useRef<number | null>(null);

  useEffect(() => {
    if (!quote) return;
    if (previousPrice.current !== null && quote.price !== previousPrice.current) {
      setFlash(quote.price > previousPrice.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      previousPrice.current = quote.price;
      return () => clearTimeout(t);
    }
    previousPrice.current = quote.price;
  }, [quote?.price]);

  const isPositive = (quote?.change ?? 0) >= 0;
  const isFlat = (quote?.change ?? 0) === 0;

  return (
    <Panel eyebrow="Live Price" title={symbol} className="relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          flash === "up" && "animate-ticker-flash-up",
          flash === "down" && "animate-ticker-flash-down"
        )}
      />
      {quote ? (
        <div className="flex items-end justify-between">
          <div>
            <p className="numeric font-mono text-3xl font-semibold text-ink sm:text-4xl">
              {formatPrice(quote.price, quote.currency)}
            </p>
            <div
              className={cn(
                "mt-2 flex items-center gap-1.5 text-sm font-medium",
                isFlat ? "text-ink-muted" : isPositive ? "text-bull" : "text-bear"
              )}
            >
              {isFlat ? <Minus size={15} /> : isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              <span className="numeric">{formatPrice(quote.change, quote.currency)}</span>
              <span className="numeric">({formatPercent(quote.change_percent)})</span>
            </div>
          </div>
        </div>
      ) : (
        <div aria-hidden className="animate-pulse">
          <div className="h-9 w-36 rounded-lg bg-surface-raised sm:h-10" />
          <div className="mt-2.5 h-4 w-28 rounded bg-surface-raised" />
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs">
        {[
          { label: "Day High", value: quote ? formatPrice(quote.day_high, quote.currency) : null },
          { label: "Day Low", value: quote ? formatPrice(quote.day_low, quote.currency) : null },
          { label: "Volume", value: quote ? formatCompactNumber(quote.volume) : null },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-ink-faint">{item.label}</p>
            {item.value !== null ? (
              <p className="numeric mt-1 font-medium text-ink">{item.value}</p>
            ) : (
              <div aria-hidden className="mt-1.5 h-3.5 w-14 animate-pulse rounded bg-surface-raised" />
            )}
          </div>
        ))}
      </div>

      {quote && (
        <div className="mt-4 flex items-center justify-between">
          <LastUpdated updatedAt={quote.as_of} live={isLive} isStale={isStale} />
          {quote.is_delayed && <span className="text-[11px] text-ink-faint">Delayed data</span>}
        </div>
      )}
    </Panel>
  );
}
