import Link from "next/link";

import { BrandMark } from "@/components/BrandMark";

const PRODUCT_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
  { href: "/dashboard", label: "AI Insights" },
  { href: "/backtesting", label: "Backtesting" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-canvas px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/">
              <BrandMark />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              Live market data, technical indicators, transparent predictions, risk scoring, and AI-powered
              insights for stocks, ETFs, crypto, forex, commodities, and indices - in one terminal.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Product</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Legal</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-ink-faint">
            Market data may be delayed. AI insights are for informational purposes only and are not financial
            advice.
          </p>
          <p className="whitespace-nowrap text-xs text-ink-faint">© {year} Market Mind Live. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
