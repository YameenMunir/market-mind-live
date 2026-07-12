"use client";

import { ChevronDown, Compass, Gauge, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { cn } from "@/lib/utils";
import type { ExperienceMode } from "@/types";

interface DashboardViewMenuProps {
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
  onRestartTour: () => void;
  experienceMode: ExperienceMode;
  onToggleExperienceMode: () => void;
}

const MENU_ITEM_CLASSES =
  "flex min-h-[44px] w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink";

/** A small "View" dropdown in the dashboard toolbar with Fullscreen Dashboard,
 * Hide/Show Sidebar, Simple/Advanced mode, and Take the Tour options. Once fullscreen
 * is active, the dropdown is replaced by a standalone Exit Fullscreen button - always
 * visible, no need to reopen a menu to find the way out. */
export function DashboardViewMenu({
  isFullscreen,
  onEnterFullscreen,
  onExitFullscreen,
  onRestartTour,
  experienceMode,
  onToggleExperienceMode,
}: DashboardViewMenuProps) {
  const { isCollapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapse();

  if (isFullscreen) {
    return (
      <Button
        variant="secondary"
        size="md"
        onClick={onExitFullscreen}
        aria-label="Exit fullscreen dashboard"
        title="Exit fullscreen"
        className="gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <Minimize2 size={13} aria-hidden />
        <span className="hidden sm:inline">Exit Fullscreen</span>
      </Button>
    );
  }

  return (
    <Dropdown
      data-tour="view-menu"
      panelLabel="Dashboard view options"
      panelClassName="w-56"
      trigger={({ isOpen, toggle }) => (
        <Button
          variant="secondary"
          size="md"
          onClick={toggle}
          aria-label="Dashboard view options"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          title="View options"
          className="gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <Maximize2 size={13} aria-hidden />
          <span className="hidden sm:inline">View</span>
          <ChevronDown size={13} aria-hidden className={cn("transition-transform duration-150", isOpen && "rotate-180")} />
        </Button>
      )}
    >
      {({ close }) => (
        <>
          <button
            role="menuitem"
            onClick={() => {
              onEnterFullscreen();
              close();
            }}
            className={MENU_ITEM_CLASSES}
          >
            <Maximize2 size={15} aria-hidden />
            Fullscreen Dashboard
          </button>
          <button
            role="menuitem"
            onClick={() => {
              toggleSidebar();
              close();
            }}
            className={cn(MENU_ITEM_CLASSES, "hidden lg:flex")}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={15} aria-hidden /> : <PanelLeftClose size={15} aria-hidden />}
            {isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onToggleExperienceMode();
              close();
            }}
            className={MENU_ITEM_CLASSES}
          >
            {experienceMode === "advanced" ? <Sparkles size={15} aria-hidden /> : <Gauge size={15} aria-hidden />}
            {experienceMode === "advanced" ? "Switch to Simple View" : "Switch to Advanced View"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onRestartTour();
              close();
            }}
            className={MENU_ITEM_CLASSES}
          >
            <Compass size={15} aria-hidden />
            Take the Tour
          </button>
        </>
      )}
    </Dropdown>
  );
}
