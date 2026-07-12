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
      className={cn("rounded-sm border border-border bg-surface p-3.5 sm:p-4", className)}
    >
      {(title || eyebrow || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div className="min-w-0">
            {eyebrow && <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-faint">{eyebrow}</p>}
            {title && <h3 className="mt-1.5 text-sm font-mono font-bold uppercase tracking-wide text-ink">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
