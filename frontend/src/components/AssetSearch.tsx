"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/Badge";
import { FIELD_CHROME_CLASSES } from "@/components/Input";
import { useAssetSearch } from "@/hooks/useAssetSearch";
import { ASSET_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AssetSearchResult, AssetType } from "@/types";

interface AssetSearchProps {
  assetType: AssetType | null;
  onSelect: (asset: AssetSearchResult) => void;
}

// Flat monogram badge, not a per-symbol gradient avatar - ticker identity comes from
// the symbol text next to it, so the logo only needs to be a consistent, legible mark.
function AssetLogo({ symbol }: { symbol: string }) {
  const letter = symbol.replace(/-USD$|=X$|^\^/, "").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface-raised text-[10px] font-bold font-mono text-ink-muted">
      {letter}
    </div>
  );
}

const formatPrice = (price: number | null | undefined, assetType: string, currency: string) => {
  if (price === null || price === undefined) return "";
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const decimals = assetType === "forex" ? 4 : 2;
  return `${symbol}${price.toFixed(decimals)}`;
};

const formatChange = (changePercent: number | null | undefined) => {
  if (changePercent === null || changePercent === undefined) return null;
  const prefix = changePercent > 0 ? "+" : "";
  const colorClass = changePercent >= 0 ? "text-bull" : "text-bear";
  return {
    text: `${prefix}${changePercent.toFixed(2)}%`,
    className: colorClass
  };
};

export function AssetSearch({ assetType, onSelect }: AssetSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { results, isLoading } = useAssetSearch(query, assetType ?? undefined);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isExpanded = isOpen && query.length > 0;

  return (
    <div ref={containerRef} data-tour="asset-search" className="relative w-full max-w-md">
      <div className={cn("relative z-50 flex items-center gap-2 px-3 py-2.5 focus-within:border-brand/60 sm:py-2", FIELD_CHROME_CLASSES)}>
        <Search size={16} className="shrink-0 text-ink-faint" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setIsOpen(false);
              e.currentTarget.blur();
            }
          }}
          type="search"
          role="combobox"
          aria-label="Search assets by symbol or name"
          aria-expanded={isExpanded}
          aria-controls="asset-search-results"
          autoComplete="off"
          placeholder="Search symbol or name (AAPL, Bitcoin, EUR/USD...)"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-2xs text-ink-faint sm:block">
            esc
          </kbd>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Backdrop dims the rest of the dashboard so the dropdown reads as a
              floating layer above the page instead of appearing to collide with
              the cards behind it. */}
          <div className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
          <div
            id="asset-search-results"
            role="listbox"
            aria-label="Asset search results"
            className="animate-dropdown-in absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-popover ring-1 ring-black/20"
          >
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-ink-faint" role="status">
                <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-ink-faint border-t-transparent" aria-hidden />
                Searching...
              </div>
            )}
            {!isLoading && results.length === 0 && (
              <div className="px-3 py-3 text-xs text-ink-faint">
                No matches for &ldquo;{query}&rdquo;. Try a ticker symbol like AAPL or BTC-USD.
              </div>
            )}
            {!isLoading &&
              results.map((asset) => {
                const change = formatChange(asset.change_percent);
                const isMarketOpen = asset.market_status === "open";
                const isPreOrPost = asset.market_status === "pre_market" || asset.market_status === "after_hours";
                
                return (
                  <button
                    key={asset.symbol}
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onSelect(asset);
                      setQuery("");
                      setIsOpen(false);
                    }}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 px-3 py-2.5 text-left border-b border-border/30 last:border-b-0 transition-all hover:bg-surface focus-visible:bg-surface"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <AssetLogo symbol={asset.symbol} />
                      <span className="flex flex-col min-w-0 gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-semibold text-ink leading-none">{asset.symbol}</span>
                          {asset.market_status && (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full inline-block shrink-0",
                                isMarketOpen ? "bg-bull" : isPreOrPost ? "bg-warn" : "bg-ink-faint"
                              )}
                              title={`Market: ${asset.market_status.replace("_", " ")}`}
                            />
                          )}
                        </span>
                        <span className="truncate text-2xs font-medium text-ink-muted flex items-center gap-1 leading-none">
                          <span className="truncate max-w-[150px]">{asset.name}</span>
                          <span className="text-ink-faint shrink-0">•</span>
                          <span className="text-ink-faint shrink-0">{asset.exchange}</span>
                        </span>
                      </span>
                    </span>

                    <span className="flex items-center gap-3 font-mono shrink-0">
                      {asset.price !== null && asset.price !== undefined ? (
                        <div className="flex flex-col items-end gap-0.5 leading-none">
                          <span className="text-xs font-semibold text-ink">
                            {formatPrice(asset.price, asset.asset_type, asset.currency || "USD")}
                          </span>
                          {change && (
                            <span className={cn("text-2xs font-bold", change.className)}>
                              {change.text}
                            </span>
                          )}
                        </div>
                      ) : null}
                      <Badge size="sm" uppercase className="bg-surface/80 border border-border/60 text-ink-faint px-1.5 py-0.5 shrink-0 leading-none">
                        {ASSET_TYPE_LABELS[asset.asset_type]}
                      </Badge>
                    </span>
                  </button>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
