"use client";

import { Check, Coins, Loader2 } from "lucide-react";

import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CurrencySelector() {
  const { currency, setCurrency, isLoadingRates } = useCurrencyContext();

  return (
    <Dropdown
      panelRole="listbox"
      panelLabel="Display currency"
      panelClassName="max-h-80 w-56 overflow-y-auto"
      trigger={({ isOpen, toggle }) => (
        <Button
          variant="secondary"
          size="md"
          onClick={toggle}
          aria-label="Change display currency"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          title="Change display currency"
          className="gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          {isLoadingRates ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Coins size={13} aria-hidden />}
          {currency}
        </Button>
      )}
    >
      {({ close }) =>
        SUPPORTED_CURRENCIES.map((c) => (
          <button
            key={c.code}
            role="option"
            aria-selected={c.code === currency}
            onClick={() => {
              setCurrency(c.code);
              close();
            }}
            className={cn(
              "flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface",
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
        ))
      }
    </Dropdown>
  );
}
