import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  /** Anchor for OnboardingTour.tsx to highlight this panel - see lib/onboardingSteps.ts. */
  dataTour?: string;
}

export function Panel({ children, className, title, eyebrow, action, dataTour }: PanelProps) {
  return (
    <section
      aria-label={title ?? eyebrow}
      data-tour={dataTour}
      className={cn("rounded-2xl border border-border bg-surface p-4 shadow-panel sm:p-5", className)}
    >
      {(title || eyebrow || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{eyebrow}</p>}
            {title && <h3 className="mt-0.5 text-sm font-semibold text-ink">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
