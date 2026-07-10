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
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-ink-faint sm:block">
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
              results.map((asset) => (
                <button
                  key={asset.symbol}
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onSelect(asset);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface focus-visible:bg-surface"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="shrink-0 font-mono text-sm font-medium text-ink">{asset.symbol}</span>
                    <span className="truncate text-xs text-ink-muted">{asset.name}</span>
                  </span>
                  <Badge size="sm" uppercase className="bg-surface text-ink-faint">
                    {ASSET_TYPE_LABELS[asset.asset_type]}
                  </Badge>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
