"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mml-sidebar-collapsed";

/** Persists sidebar visibility and drives it via a class on <html> (same pattern as
 * useTheme). This holds the actual state and must only be instantiated ONCE, by
 * SidebarCollapseProvider (see @/contexts/SidebarCollapseContext) - every consumer
 * (Sidebar, SidebarExpandButton, DashboardViewMenu, ...) reads/writes that single
 * shared instance via the provider's context instead of calling this directly, or
 * each would get its own independent state and silently fall out of sync with the
 * others (exactly the bug this hook used to have before the context was added). */
export function useSidebarCollapseState() {
  const [isCollapsed, setIsCollapsedState] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setIsCollapsedState(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-collapsed", isCollapsed);
    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const setIsCollapsed = (value: boolean) => setIsCollapsedState(value);
  const toggle = () => setIsCollapsedState((prev) => !prev);

  return { isCollapsed, setIsCollapsed, toggle };
}
