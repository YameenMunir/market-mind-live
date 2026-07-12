import { Bell } from "lucide-react";

import { Button } from "@/components/Button";

interface AlertsBellButtonProps {
  onClick: () => void;
  activeCount: number;
}

export function AlertsBellButton({ onClick, activeCount }: AlertsBellButtonProps) {
  return (
    <Button variant="secondary" size="icon" onClick={onClick} aria-label="Open alerts" className="relative">
      <Bell size={16} />
      {activeCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-2xs font-bold leading-none text-canvas">
          {activeCount > 9 ? "9+" : activeCount}
        </span>
      )}
    </Button>
  );
}
