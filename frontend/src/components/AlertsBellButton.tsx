import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";

interface AlertsBellButtonProps {
  onClick: () => void;
  activeCount: number;
}

export function AlertsBellButton({ onClick, activeCount }: AlertsBellButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open alerts"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-ink-muted transition-colors hover:text-ink"
    >
      <Bell size={15} />
      {activeCount > 0 && (
        <span
          className={cn(
            "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-canvas"
          )}
        >
          {activeCount > 9 ? "9+" : activeCount}
        </span>
      )}
    </button>
  );
}
