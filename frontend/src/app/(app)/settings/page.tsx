"use client";

import { SettingsPanel } from "@/components/SettingsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { isCollapsed } = useSidebarCollapse();

  return (
    <>
      <header
        className={cn(
          "flex items-center justify-between border-b border-border bg-surface/20 px-4 py-3.5 sm:px-6 sm:py-4",
          isCollapsed && "lg:pl-28"
        )}
      >
        <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">Settings</h1>
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 lg:pb-6">
        <div className="mx-auto max-w-2xl">
          <SettingsPanel />
        </div>
      </main>
    </>
  );
}
