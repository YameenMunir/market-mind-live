"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useCurrency } from "@/hooks/useCurrency";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/currency";

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  /** Converts `amount` (denominated in `nativeCurrency`) into the selected display
   * currency. Returns `amount` unchanged if rates aren't loaded yet or either currency
   * is unsupported. */
  convert: (amount: number | null | undefined, nativeCurrency: string) => number | null;
  ratesUpdatedAt: string | null;
  isLoadingRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { currency, setCurrency } = useCurrency();
  const fx = useFxRates();

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      convert: (amount, nativeCurrency) => {
        if (amount === null || amount === undefined) return null;
        return convertAmount(amount, nativeCurrency, currency, fx.data?.rates);
      },
      ratesUpdatedAt: fx.data?.as_of ?? null,
      isLoadingRates: fx.isLoading && !fx.data,
    }),
    [currency, setCurrency, fx.data, fx.isLoading]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrencyContext(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrencyContext must be used within a CurrencyProvider");
  return ctx;
}
