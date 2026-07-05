"use client";

import Link from "next/link";
import { Home, PanelLeftOpen } from "lucide-react";

import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";

/** Sidebar visibility is a persisted, app-wide preference (not just a dashboard
 * setting), so this floating control cluster lives in the shared (app) layout rather
 * than the dashboard toolbar - otherwise hiding the sidebar from the dashboard would
 * strand desktop users with no way back once they navigate to Backtesting/Settings.
 * Also surfaces a "back to homepage" link here, since collapsing the sidebar hides
 * the only other home link (the brand mark at its top). */
export function SidebarExpandButton() {
  const { isCollapsed, setIsCollapsed } = useSidebarCollapse();

  if (!isCollapsed) return null;

  return (
    <div className="fixed left-3 top-3 z-40 hidden items-center gap-2 lg:flex">
      <Link
        href="/"
        aria-label="Back to homepage"
        title="Back to homepage"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted shadow-panel transition-colors hover:border-ink-faint/40 hover:text-ink"
      >
        <Home size={16} />
      </Link>
      <button
        onClick={() => setIsCollapsed(false)}
        aria-label="Show sidebar"
        title="Show sidebar"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted shadow-panel transition-colors hover:border-ink-faint/40 hover:text-ink"
      >
        <PanelLeftOpen size={16} />
      </button>
    </div>
  );
}
