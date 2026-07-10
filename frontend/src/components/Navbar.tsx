"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/BrandMark";
import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/backtesting", label: "Backtesting" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
        <Link href="/" aria-label="Market Mind Live home">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Site navigation">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-sm border px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider transition-colors",
                  isActive
                    ? "bg-surface border-border border-b-brand border-b-2 text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className={cn(
              BUTTON_VARIANT_STYLES.primary,
              BUTTON_SIZE_STYLES.lg,
              "inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150"
            )}
          >
            <span className="sm:hidden">Launch</span>
            <span className="hidden sm:inline">Launch Dashboard</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
