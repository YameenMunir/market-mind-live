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
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      <label className="flex cursor-pointer select-none items-center gap-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
        <input
          type="checkbox"
          checked={showMA}
          onChange={(e) => onToggleMA(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-brand"
        />
        Moving Averages
      </label>
      <label className="flex cursor-pointer select-none items-center gap-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
        <input
          type="checkbox"
          checked={showBB}
          onChange={(e) => onToggleBB(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-brand"
        />
        Bollinger Bands
      </label>
    </div>
  );
}
