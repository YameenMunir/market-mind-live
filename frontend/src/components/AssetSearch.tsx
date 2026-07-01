"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

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

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative z-50 flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 transition-colors focus-within:border-brand/60">
        <Search size={16} className="shrink-0 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search symbol or name (AAPL, Bitcoin, EUR/USD...)"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {query && (
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-ink-faint sm:block">
            esc
          </kbd>
        )}
      </div>

      {isOpen && query.length > 0 && (
        <>
          {/* Backdrop dims the rest of the dashboard so the dropdown reads as a
              floating layer above the page instead of appearing to collide with
              the cards behind it. */}
          <div className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-panel ring-1 ring-black/20">
            {isLoading && <div className="px-3 py-3 text-xs text-ink-faint">Searching...</div>}
            {!isLoading && results.length === 0 && (
              <div className="px-3 py-3 text-xs text-ink-faint">No matching assets found.</div>
            )}
            {!isLoading &&
              results.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => {
                    onSelect(asset);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="shrink-0 font-mono text-sm font-medium text-ink">{asset.symbol}</span>
                    <span className="truncate text-xs text-ink-muted">{asset.name}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint"
                    )}
                  >
                    {ASSET_TYPE_LABELS[asset.asset_type]}
                  </span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
