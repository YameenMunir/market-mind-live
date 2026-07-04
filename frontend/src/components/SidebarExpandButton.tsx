"use client";

import { PanelLeftOpen } from "lucide-react";

import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";

/** Sidebar visibility is a persisted, app-wide preference (not just a dashboard
 * setting), so this floating re-open control lives in the shared (app) layout rather
 * than the dashboard toolbar - otherwise hiding the sidebar from the dashboard would
 * strand desktop users with no way back once they navigate to Backtesting/Settings. */
export function SidebarExpandButton() {
  const { isCollapsed, setIsCollapsed } = useSidebarCollapse();

  if (!isCollapsed) return null;

  return (
    <button
      onClick={() => setIsCollapsed(false)}
      aria-label="Show sidebar"
      title="Show sidebar"
      className="fixed left-3 top-3 z-40 hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted shadow-panel transition-colors hover:border-ink-faint/40 hover:text-ink lg:flex"
    >
      <PanelLeftOpen size={16} />
    </button>
  );
}
