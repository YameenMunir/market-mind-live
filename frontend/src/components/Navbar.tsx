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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
        <Link href="/" aria-label="Market Mind Live home">
          <BrandMark />
        </Link>

        {/* Desktop site navigation */}
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
          
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-sm border border-border bg-surface text-ink-muted hover:text-ink sm:hidden transition-colors outline-none"
            aria-expanded={isOpen}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation overlay / dropdown drawer */}
      {isOpen && (
        <div className="border-t border-border bg-canvas px-4 py-3 sm:hidden shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
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
                    "rounded-sm border px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider transition-all",
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
