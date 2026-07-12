"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutGrid, Settings } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/backtesting", label: "Backtesting", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      {/* Top Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-canvas/85 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 py-3">
          <Link href="/" aria-label="Market Mind Live home">
            <BrandMark />
          </Link>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-canvas/90 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 w-16 py-1 text-[10px] font-mono uppercase font-bold tracking-wider transition-colors",
                  isActive ? "text-brand" : "text-ink-muted hover:text-ink"
                )}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn("transition-colors", isActive ? "text-brand" : "text-ink-faint")}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
