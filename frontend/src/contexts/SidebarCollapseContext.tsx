"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useSidebarCollapseState } from "@/hooks/useSidebarCollapse";

interface SidebarCollapseContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggle: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const { isCollapsed, setIsCollapsed, toggle } = useSidebarCollapseState();

  const value = useMemo<SidebarCollapseContextValue>(
    () => ({ isCollapsed, setIsCollapsed, toggle }),
    [isCollapsed, setIsCollapsed, toggle]
  );

  return <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>;
}

export function useSidebarCollapse(): SidebarCollapseContextValue {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) throw new Error("useSidebarCollapse must be used within a SidebarCollapseProvider");
  return ctx;
}
