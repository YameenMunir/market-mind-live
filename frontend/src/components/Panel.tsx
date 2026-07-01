import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function Panel({ children, className, title, eyebrow, action }: PanelProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-panel", className)}>
      {(title || eyebrow || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{eyebrow}</p>}
            {title && <h3 className="mt-0.5 text-sm font-semibold text-ink">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
