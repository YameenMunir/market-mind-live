"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Compass, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/Button";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { cn } from "@/lib/utils";

interface DashboardViewMenuProps {
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
  onRestartTour: () => void;
}

/** A small "View" dropdown in the dashboard toolbar with Fullscreen Dashboard and
 * Hide/Show Sidebar options. Once fullscreen is active, the dropdown is replaced by
 * a standalone Exit Fullscreen button - always visible, no need to reopen a menu to
 * find the way out. */
export function DashboardViewMenu({ isFullscreen, onEnterFullscreen, onExitFullscreen, onRestartTour }: DashboardViewMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isCollapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapse();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="md"
        onClick={() => setIsOpen((v) => !v)}
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

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            role="menu"
            aria-label="Dashboard view options"
            className="animate-dropdown-in absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-panel ring-1 ring-black/20"
          >
            <button
              role="menuitem"
              onClick={() => {
                onEnterFullscreen();
                setIsOpen(false);
              }}
              className="flex min-h-[44px] w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Maximize2 size={15} aria-hidden />
              Fullscreen Dashboard
            </button>
            <button
              role="menuitem"
              onClick={() => {
                toggleSidebar();
                setIsOpen(false);
              }}
              className="flex min-h-[44px] w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={15} aria-hidden />
              ) : (
                <PanelLeftClose size={15} aria-hidden />
              )}
              {isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                onRestartTour();
                setIsOpen(false);
              }}
              className="flex min-h-[44px] w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Compass size={15} aria-hidden />
              Take the Tour
            </button>
          </div>
        </>
      )}
    </div>
  );
}
