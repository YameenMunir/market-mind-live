"use client";

import { ASSET_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AssetType } from "@/types";

interface AssetTypeSelectorProps {
  value: AssetType | null;
  onChange: (value: AssetType | null) => void;
}

const ORDER: AssetType[] = ["stock", "etf", "crypto", "forex", "commodity", "index"];

const PILL_BASE =
  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer";
const PILL_ACTIVE = "bg-brand text-canvas";
const PILL_INACTIVE = "bg-surface-raised text-ink-muted hover:bg-surface hover:text-ink";

export function AssetTypeSelector({ value, onChange }: AssetTypeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by asset type">
      <button
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(PILL_BASE, value === null ? PILL_ACTIVE : PILL_INACTIVE)}
      >
        All
      </button>
      {ORDER.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          aria-pressed={value === type}
          className={cn(PILL_BASE, value === type ? PILL_ACTIVE : PILL_INACTIVE)}
        >
          {ASSET_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
