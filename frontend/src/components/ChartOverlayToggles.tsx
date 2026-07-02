import { cn } from "@/lib/utils";

interface ChartOverlayTogglesProps {
  showMA: boolean;
  onToggleMA: (value: boolean) => void;
  showBB: boolean;
  onToggleBB: (value: boolean) => void;
  className?: string;
}

export function ChartOverlayToggles({ showMA, onToggleMA, showBB, onToggleBB, className }: ChartOverlayTogglesProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" checked={showMA} onChange={(e) => onToggleMA(e.target.checked)} className="accent-brand" />
        Moving Averages
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" checked={showBB} onChange={(e) => onToggleBB(e.target.checked)} className="accent-brand" />
        Bollinger Bands
      </label>
    </div>
  );
}
