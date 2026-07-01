"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, LayoutGrid, Menu, Settings, X } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/backtesting", label: "Backtesting", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="border-b border-border bg-canvas lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/">
          <BrandMark />
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted"
        >
          <Menu size={18} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <nav className="relative ml-auto flex h-full w-72 max-w-[80vw] flex-col gap-1 border-l border-border bg-surface p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <BrandMark />
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-surface-raised text-ink" : "text-ink-muted hover:bg-surface-raised/60 hover:text-ink"
                  )}
                >
                  <Icon size={17} strokeWidth={2} className={isActive ? "text-brand" : "text-ink-faint"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
