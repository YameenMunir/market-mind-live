import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T> {
  value: T;
  content: ReactNode;
  "aria-label"?: string;
}

export type SegmentedControlVariant = "track" | "row" | "grid";

interface SegmentedControlProps<T> {
  /** Loosened to `T | null | undefined` independent of `onChange`'s `T` so a caller
   * can represent "nothing selected yet" (e.g. a theme/preference not yet loaded
   * from storage) without `onChange` having to accept a value no option ever has. */
  value: T | null | undefined;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  /** `track` - compact toolbar switcher on a single surface-raised rail (e.g. chart
   * timeframe). `row` - wrapping filter/pill row (e.g. asset-type filter). `grid` -
   * larger bordered choice cards, columns set via `className` (e.g. Settings). */
  variant?: SegmentedControlVariant;
  className?: string;
  optionClassName?: string;
}

const CONTAINER_STYLES: Record<SegmentedControlVariant, string> = {
  track: "flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-sm border border-border bg-surface-raised p-1",
  row: "flex flex-wrap items-center gap-1.5",
  grid: "grid grid-cols-1 gap-3 sm:grid-cols-2",
};

const OPTION_STYLES: Record<SegmentedControlVariant, { base: string; active: string; inactive: string }> = {
  track: {
    base: "shrink-0 whitespace-nowrap rounded-sm px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
    active: "border border-border/80 bg-surface text-ink",
    inactive: "border border-transparent text-ink-muted hover:text-ink",
  },
  row: {
    base: "rounded-sm border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
    active: "border-brand/40 bg-brand/5 text-ink",
    inactive: "border-border text-ink-muted hover:border-ink-faint/40 hover:bg-surface-raised/60 hover:text-ink",
  },
  grid: {
    base: "flex flex-col items-start gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
    active: "border-brand/40 bg-brand/5 text-ink",
    inactive: "border-border text-ink-muted hover:border-ink-faint/40 hover:bg-surface",
  },
};

/** Shared "pick one of N" primitive - owns the container layout, active/inactive
 * chrome, and `role="group"`/`aria-pressed` wiring once, so callers only supply
 * per-option content. Extracted after Settings' three choice-grids, AssetTypeSelector's
 * pill row, and TimeframeSelector's segmented track each independently hand-rolled the
 * same active/inactive ternary. Content stays a render slot (not a fixed
 * icon/label/description shape) since Settings' currency grid needs a
 * symbol-prefix + trailing checkmark layout that a fixed shape can't express. */
export function SegmentedControl<T>({
  value,
  onChange,
  options,
  ariaLabel,
  variant = "row",
  className,
  optionClassName,
}: SegmentedControlProps<T>) {
  const styles = OPTION_STYLES[variant];
  return (
    <div role="group" aria-label={ariaLabel} className={cn(CONTAINER_STYLES[variant], className)}>
      {options.map((option, index) => {
        const isActive = option.value === value;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            aria-label={option["aria-label"]}
            className={cn(styles.base, isActive ? styles.active : styles.inactive, optionClassName)}
          >
            {option.content}
          </button>
        );
      })}
    </div>
  );
}
