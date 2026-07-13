import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  /** Shows a neutral, midpoint switch position instead of committing to `checked`'s
   * value, and disables interaction - for a preference whose real persisted value
   * isn't known yet (e.g. still hydrating from localStorage on mount), so the control
   * never has to confidently display what might be the wrong on/off state for a
   * moment. See useChartPreferences.ts's `isReady` doc for the source of that window. */
  loading?: boolean;
}

export function Toggle({ checked, onChange, label, description, loading }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <button type="button" onClick={() => onChange(!checked)} className="min-w-0 cursor-pointer text-left" tabIndex={-1}>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>}
      </button>
      <button
        role="switch"
        aria-checked={loading ? false : checked}
        aria-label={label}
        aria-busy={loading || undefined}
        disabled={loading}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-sm border transition-all duration-200 ease-in-out disabled:cursor-not-allowed",
          loading
            ? "border-border bg-surface-raised motion-safe:animate-pulse"
            : checked
              ? "border-brand/45 bg-brand/5"
              : "border-border bg-surface-raised"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-sm transition-all duration-200 ease-in-out",
            loading ? "translate-x-[10px] bg-ink-faint/50" : checked ? "translate-x-[20px] bg-brand" : "translate-x-0 bg-ink-faint"
          )}
        />
      </button>
    </div>
  );
}
