"use client";

import type { ReactNode } from "react";

import { AssetSearch } from "@/components/AssetSearch";
import { AssetTypeSelector } from "@/components/AssetTypeSelector";
import { CurrencySelector } from "@/components/CurrencySelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { cn } from "@/lib/utils";
import type { AssetSearchResult, AssetType } from "@/types";

interface TopbarProps {
  assetType: AssetType | null;
  onAssetTypeChange: (type: AssetType | null) => void;
  onSelectAsset: (asset: AssetSearchResult) => void;
  rightSlot?: ReactNode;
  title?: string;
}

export function Topbar({ assetType, onAssetTypeChange, onSelectAsset, rightSlot, title }: TopbarProps) {
  const { isCollapsed } = useSidebarCollapse();

  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border bg-surface/20 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between",
        // The floating home/expand buttons sit fixed at the top-left when the sidebar is
        // collapsed - reserve room so the title/search row never renders underneath them.
        isCollapsed && "lg:pl-28"
      )}
    >
      <div className="flex flex-col gap-2 lg:flex-1">
        {title && <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-ink-muted">{title}</h1>}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <AssetSearch assetType={assetType} onSelect={onSelectAsset} />
          <AssetTypeSelector value={assetType} onChange={onAssetTypeChange} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {rightSlot}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          <CurrencySelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
