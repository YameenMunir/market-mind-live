"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="border-b border-border bg-canvas lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" aria-label="Market Mind Live home">
          <BrandMark />
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink-muted transition-colors hover:text-ink"
        >
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsOpen(false)}
            />
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="relative ml-auto flex h-full w-72 max-w-[80vw] flex-col gap-1 border-l border-border bg-surface p-4 shadow-panel"
            >
              <div className="mb-4 flex items-center justify-between">
                <BrandMark />
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
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

              <div className="mt-auto rounded-xl border border-border bg-surface-raised/60 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Data source</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  Live quotes are delayed and provided for informational purposes only. Not financial advice.
                </p>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
