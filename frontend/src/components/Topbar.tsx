"use client";

import type { ReactNode } from "react";

import { AssetSearch } from "@/components/AssetSearch";
import { AssetTypeSelector } from "@/components/AssetTypeSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AssetSearchResult, AssetType } from "@/types";

interface TopbarProps {
  assetType: AssetType | null;
  onAssetTypeChange: (type: AssetType | null) => void;
  onSelectAsset: (asset: AssetSearchResult) => void;
  rightSlot?: ReactNode;
  title?: string;
}

export function Topbar({ assetType, onAssetTypeChange, onSelectAsset, rightSlot, title }: TopbarProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border bg-canvas px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 lg:flex-1">
        {title && <h1 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">{title}</h1>}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <AssetSearch assetType={assetType} onSelect={onSelectAsset} />
          <AssetTypeSelector value={assetType} onChange={onAssetTypeChange} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {rightSlot}
        <ThemeToggle />
      </div>
    </header>
  );
}
