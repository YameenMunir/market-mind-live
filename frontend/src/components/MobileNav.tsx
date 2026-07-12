"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, LayoutGrid, Menu, Settings, X } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { CurrencySelector } from "@/components/CurrencySelector";
import { ThemeToggle } from "@/components/ThemeToggle";
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

  return (
    <div className="border-b border-border bg-canvas lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" aria-label="Market Mind Live home">
          <BrandMark />
        </Link>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
        >
          <Menu size={18} />
        </Button>
      </div>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        variant="drawer"
        labelledBy="mobile-nav-title"
        className="w-72 max-w-[80vw]"
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <div id="mobile-nav-title">
              <BrandMark />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </Button>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-surface-raised text-ink" : "text-ink-muted hover:bg-surface-raised/60 hover:text-ink"
                  )}
                >
                  <Icon size={17} strokeWidth={2} className={isActive ? "text-brand" : "text-ink-faint"} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-border pt-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-faint">Preferences</p>
            <div className="mt-3.5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-ink-muted">Currency</span>
                <CurrencySelector />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-ink-muted">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>

          <div className="mt-auto rounded-xl border border-border bg-surface-raised/60 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Data source</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              Live quotes are delayed and provided for informational purposes only. Not financial advice.
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
