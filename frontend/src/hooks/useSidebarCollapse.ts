"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mml-sidebar-collapsed";

/** Persists sidebar visibility and drives it via a class on <html> (same pattern as
 * useTheme) rather than prop-threading React state - the Sidebar's collapse animation
 * is pure CSS, so any component that toggles this stays in sync with it instantly,
 * without needing a shared context. */
export function useSidebarCollapse() {
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
