"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { cn } from "@/lib/utils";

interface DashboardViewMenuProps {
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
}

/** A small "View" dropdown in the dashboard toolbar with Fullscreen Dashboard and
 * Hide/Show Sidebar options. Once fullscreen is active, the dropdown is replaced by
 * a standalone Exit Fullscreen button - always visible, no need to reopen a menu to
 * find the way out. */
export function DashboardViewMenu({ isFullscreen, onEnterFullscreen, onExitFullscreen }: DashboardViewMenuProps) {
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
      <button
        onClick={onExitFullscreen}
        aria-label="Exit fullscreen dashboard"
        title="Exit fullscreen"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 text-xs font-semibold text-ink-muted transition-colors hover:border-ink-faint/40 hover:text-ink"
      >
        <Minimize2 size={13} aria-hidden />
        <span className="hidden sm:inline">Exit Fullscreen</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Dashboard view options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="View options"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 text-xs font-semibold text-ink-muted transition-colors hover:border-ink-faint/40 hover:text-ink"
      >
        <Maximize2 size={13} aria-hidden />
        <span className="hidden sm:inline">View</span>
        <ChevronDown size={13} aria-hidden className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            role="menu"
            aria-label="Dashboard view options"
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-panel ring-1 ring-black/20"
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
          </div>
        </>
      )}
    </div>
  );
}
