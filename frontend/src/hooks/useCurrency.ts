"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mml-currency";
const DEFAULT_CURRENCY = "USD";

export function useCurrency() {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setCurrencyState(stored);
  }, []);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  };

  return { currency, setCurrency };
}
