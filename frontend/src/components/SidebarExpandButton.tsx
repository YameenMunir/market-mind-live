"use client";

import Link from "next/link";
import { Home, PanelLeftOpen } from "lucide-react";

import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES, Button } from "@/components/Button";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { cn } from "@/lib/utils";

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
        className={cn(
          BUTTON_VARIANT_STYLES.secondary,
          BUTTON_SIZE_STYLES.icon,
          "flex items-center justify-center shadow-panel transition-colors duration-150"
        )}
      >
        <Home size={16} />
      </Link>
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setIsCollapsed(false)}
        aria-label="Show sidebar"
        title="Show sidebar"
        className="shadow-panel"
      >
        <PanelLeftOpen size={16} />
      </Button>
    </div>
  );
}
