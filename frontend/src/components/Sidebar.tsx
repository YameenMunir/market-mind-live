"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutGrid, PanelLeftClose, Settings } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/backtesting", label: "Backtesting", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { setIsCollapsed } = useSidebarCollapse();

  return (
    <aside className="sidebar-panel hidden shrink-0 overflow-hidden border-r border-border bg-surface/60 lg:flex">
      {/* Fixed-width inner wrapper so nav text/links never reflow mid-animation - the
          outer <aside> is what actually animates width to 0, clipping this via
          overflow-hidden for a clean "slide away" effect instead of a text squeeze. */}
      <div className="flex w-[228px] shrink-0 flex-col px-4 py-6">
        <div className="flex items-center justify-between gap-2 px-2">
          <Link href="/" aria-label="Market Mind Live home">
            <BrandMark />
          </Link>
          <button
            onClick={() => setIsCollapsed(true)}
            aria-label="Hide sidebar"
            title="Hide sidebar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink-muted"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        <nav className="mt-10 flex flex-col gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface-raised text-ink shadow-panel"
                    : "text-ink-muted hover:bg-surface-raised/60 hover:text-ink"
                )}
              >
                {isActive && (
                  <span aria-hidden className="absolute -left-4 h-5 w-0.5 rounded-full bg-brand" />
                )}
                <Icon
                  size={17}
                  strokeWidth={2}
                  aria-hidden
                  className={cn("transition-colors", isActive ? "text-brand" : "text-ink-faint group-hover:text-ink-muted")}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-border bg-surface-raised/60 p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Data source</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            Live quotes are delayed and provided for informational purposes only. Not financial advice.
          </p>
        </div>
      </div>
    </aside>
  );
}
