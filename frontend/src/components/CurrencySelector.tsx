"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Coins, Loader2 } from "lucide-react";

import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CurrencySelector() {
  const { currency, setCurrency, isLoadingRates } = useCurrencyContext();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const activeMeta = SUPPORTED_CURRENCIES.find((c) => c.code === currency);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Change display currency"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Change display currency"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 text-xs font-semibold text-ink-muted transition-colors hover:border-ink-faint/40 hover:text-ink"
      >
        {isLoadingRates ? (
          <Loader2 size={13} className="animate-spin" aria-hidden />
        ) : (
          <Coins size={13} aria-hidden />
        )}
        {currency}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            role="listbox"
            aria-label="Display currency"
            className="absolute right-0 z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-panel ring-1 ring-black/20"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <button
                key={c.code}
                role="option"
                aria-selected={c.code === currency}
                onClick={() => {
                  setCurrency(c.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex min-h-[40px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface",
                  c.code === currency ? "text-ink" : "text-ink-muted"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-8 shrink-0 font-mono text-xs text-ink-faint">{c.symbol}</span>
                  <span>
                    {c.code} <span className="text-ink-faint">· {c.label}</span>
                  </span>
                </span>
                {c.code === currency && <Check size={14} className="shrink-0 text-brand" aria-hidden />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
