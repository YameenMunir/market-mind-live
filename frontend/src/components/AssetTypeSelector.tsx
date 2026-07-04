"use client";

import { ASSET_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AssetType } from "@/types";

interface AssetTypeSelectorProps {
  value: AssetType | null;
  onChange: (value: AssetType | null) => void;
}

const ORDER: AssetType[] = ["stock", "etf", "crypto", "forex", "commodity", "index"];

export function AssetTypeSelector({ value, onChange }: AssetTypeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by asset type">
      <button
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          value === null ? "bg-brand text-canvas" : "bg-surface-raised text-ink-muted hover:bg-surface-raised/80 hover:text-ink"
        )}
      >
        All
      </button>
      {ORDER.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          aria-pressed={value === type}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            value === type ? "bg-brand text-canvas" : "bg-surface-raised text-ink-muted hover:bg-surface-raised/80 hover:text-ink"
          )}
        >
          {ASSET_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
