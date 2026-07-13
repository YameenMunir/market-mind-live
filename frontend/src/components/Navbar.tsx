"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { BUTTON_SIZE_STYLES, BUTTON_VARIANT_STYLES } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/backtesting", label: "Backtesting" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-canvas/80 backdrop-blur w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
        {/* px keeps the tap target >=44px even when BrandMark is icon-only below 400px */}
        <Link href="/" aria-label="Market Mind Live home" className="flex h-11 items-center px-[9px] -mx-[9px]">
          <BrandMark />
        </Link>

        {/* Desktop site navigation - shows from lg: (1024px), not sm: (640px):
         * logo + all 5 links + theme toggle + "Launch Dashboard" measured wider
         * than the available row at 768px (tablet), overflowing the header. The
         * hamburger pattern below now covers the full <1024px range instead. */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Site navigation">
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <ThemeToggle className="h-11 w-11 lg:h-9 lg:w-9" />
          <Link
            href="/dashboard"
            className={cn(
              BUTTON_VARIANT_STYLES.primary,
              BUTTON_SIZE_STYLES.lg,
              "h-11 inline-flex items-center justify-center whitespace-nowrap px-3 transition-colors duration-150 lg:h-10 lg:px-4"
            )}
          >
            <span className="lg:hidden">Launch</span>
            <span className="hidden lg:inline">Launch Dashboard</span>
          </Link>

          {/* Hamburger menu toggle - covers mobile AND tablet (<1024px); 44x44px minimum touch target */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-sm border border-border bg-surface text-ink-muted hover:text-ink lg:hidden transition-colors outline-none"
            aria-expanded={isOpen}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile/tablet navigation overlay / dropdown drawer */}
      {isOpen && (
        <div className="border-t border-border bg-canvas px-4 py-3 lg:hidden shadow-lg animate-dropdown-in">
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)} // close dropdown on navigation
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-sm border px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider transition-all",
                    isActive
                      ? "bg-surface border-border border-l-brand border-l-2 text-ink"
                      : "border-transparent text-ink-muted hover:text-ink hover:bg-surface/50"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
