import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <button type="button" onClick={() => onChange(!checked)} className="min-w-0 cursor-pointer text-left" tabIndex={-1}>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>}
      </button>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-sm border transition-all duration-200 ease-in-out",
          checked ? "border-brand/45 bg-brand/5" : "border-border bg-surface-raised"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-sm transition-all duration-200 ease-in-out",
            checked ? "translate-x-[20px] bg-brand" : "translate-x-0 bg-ink-faint"
          )}
        />
      </button>
    </div>
  );
}
