import { cn } from "@/lib/utils";

interface ChartOverlayTogglesProps {
  showMA: boolean;
  onToggleMA: (value: boolean) => void;
  showBB: boolean;
  onToggleBB: (value: boolean) => void;
  className?: string;
}

// Compact toggle chip for this inline toolbar row (sits next to TimeframeSelector /
// PricePredictorControls in both the dashboard chart panel and FullscreenChartModal's
// header) - Toggle.tsx's switch is a full-width settings-list row and doesn't fit this
// space; this reuses the same active/inactive token treatment as SegmentedControl's
// "row" variant instead of a native `accent-brand` checkbox.
function OverlayChip({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-sm border px-2.5 py-1.5 font-mono text-2xs font-semibold uppercase tracking-wider transition-colors",
        checked
          ? "border-brand/40 bg-brand/5 text-brand"
          : "border-border text-ink-muted hover:border-ink-faint/40 hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

export function ChartOverlayToggles({ showMA, onToggleMA, showBB, onToggleBB, className }: ChartOverlayTogglesProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <OverlayChip checked={showMA} onChange={onToggleMA} label="Moving Averages" />
      <OverlayChip checked={showBB} onChange={onToggleBB} label="Bollinger Bands" />
    </div>
  );
}
