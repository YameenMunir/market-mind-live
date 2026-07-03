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
      <div className="flex items-end justify-between">
        <div>
          <p className="numeric font-mono text-4xl font-semibold text-ink">
            {quote ? formatPrice(quote.price, quote.currency) : "--"}
          </p>
          <div
            className={cn(
              "mt-2 flex items-center gap-1.5 text-sm font-medium",
              isFlat ? "text-ink-muted" : isPositive ? "text-bull" : "text-bear"
            )}
          >
            {isFlat ? <Minus size={15} /> : isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            <span className="numeric">{quote ? formatPrice(quote.change, quote.currency) : "--"}</span>
            <span className="numeric">({quote ? formatPercent(quote.change_percent) : "--"})</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <p className="text-ink-faint">Day High</p>
          <p className="numeric mt-1 font-medium text-ink">{quote ? formatPrice(quote.day_high, quote.currency) : "--"}</p>
        </div>
        <div>
          <p className="text-ink-faint">Day Low</p>
          <p className="numeric mt-1 font-medium text-ink">{quote ? formatPrice(quote.day_low, quote.currency) : "--"}</p>
        </div>
        <div>
          <p className="text-ink-faint">Volume</p>
          <p className="numeric mt-1 font-medium text-ink">{quote ? formatCompactNumber(quote.volume) : "--"}</p>
        </div>
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
