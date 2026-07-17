"use client";

import { SegmentedControl } from "@/components/SegmentedControl";
import { ASSET_TYPE_LABELS } from "@/lib/constants";
import type { AssetType } from "@/types";

interface AssetTypeSelectorProps {
  value: AssetType | null;
  onChange: (value: AssetType | null) => void;
}

const ORDER: AssetType[] = ["stock", "etf", "crypto", "forex", "commodity", "index"];

export function AssetTypeSelector({ value, onChange }: AssetTypeSelectorProps) {
  return (
    <SegmentedControl<AssetType | null>
      variant="row"
      value={value}
      onChange={onChange}
      ariaLabel="Filter by asset type"
      options={[
        { value: null, content: "All" },
        ...ORDER.map((type) => ({ value: type, content: ASSET_TYPE_LABELS[type] })),
      ]}
    />
  );
}
