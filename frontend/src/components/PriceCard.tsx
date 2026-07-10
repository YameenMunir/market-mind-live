"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { LastUpdated } from "@/components/LastUpdated";
import { Panel } from "@/components/Panel";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
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
  const { currency, convert } = useCurrencyContext();
  const isConverted = !!quote && quote.currency !== currency;

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
    <Panel eyebrow="Live Price" title={symbol} className="relative flex h-full flex-col overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          flash === "up" && "animate-ticker-flash-up",
          flash === "down" && "animate-ticker-flash-down"
        )}
      />
      {quote ? (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="numeric truncate font-mono text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight text-ink">
              {formatPrice(convert(quote.price, quote.currency), currency)}
            </p>
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-x-1.5 rounded-sm border px-2 py-0.5 font-mono text-xs font-semibold",
                isFlat ? "border-border bg-surface-raised text-ink-muted" : isPositive ? "border-bull/20 bg-bull/5 text-bull" : "border-bear/20 bg-bear/5 text-bear"
              )}
            >
              {isFlat ? (
                <Minus size={13} className="shrink-0" />
              ) : isPositive ? (
                <ArrowUpRight size={13} className="shrink-0" />
              ) : (
                <ArrowDownRight size={13} className="shrink-0" />
              )}
              <span className="numeric">{formatPrice(convert(quote.change, quote.currency), currency)}</span>
              <span className="numeric">({formatPercent(quote.change_percent)})</span>
            </div>
          </div>
        </div>
      ) : (
        <div aria-hidden className="animate-pulse">
          <div className="h-9 w-36 rounded-sm bg-surface-raised sm:h-10" />
          <div className="mt-2.5 h-4 w-28 rounded-sm bg-surface-raised" />
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 font-mono text-xs sm:gap-3">
        {[
          { label: "Day High", short: "High", value: quote ? formatPrice(convert(quote.day_high, quote.currency), currency) : null },
          { label: "Day Low", short: "Low", value: quote ? formatPrice(convert(quote.day_low, quote.currency), currency) : null },
          { label: "Volume", short: "Volume", value: quote ? formatCompactNumber(quote.volume) : null },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="truncate text-[10px] uppercase font-bold text-ink-faint">
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </p>
            {item.value !== null ? (
              <p className="numeric mt-1 truncate font-semibold text-ink">{item.value}</p>
            ) : (
              <div aria-hidden className="mt-1.5 h-3.5 w-14 animate-pulse rounded bg-surface-raised" />
            )}
          </div>
        ))}
      </div>

      {quote && (
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2">
            <LastUpdated updatedAt={quote.as_of} live={isLive} isStale={isStale} />
            {quote.is_delayed && <span className="font-mono text-[10px] uppercase font-bold text-ink-faint">Delayed data</span>}
          </div>
          {isConverted && (
            <p className="mt-2 font-mono text-[9px] uppercase leading-relaxed text-ink-faint">
              Converted from {quote.currency} at FX rate.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
