"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mml-gemini-key-prompt-dismissed";

/** Gates the first-run Gemini key setup prompt: shows once per browser (persisted via
 * localStorage, the same SSR-safe pattern as hooks/useOnboardingTour.ts) unless a key
 * is already configured for this device. Dismissible - the dashboard and backtesting
 * page both work fully without a key (falls back to the mock/server-default AI
 * assistant), so skipping never blocks anything. */
export function useGeminiKeyPrompt(hasKey: boolean, isLoading: boolean) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading || hasKey) return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "true";
    if (!dismissed) setIsOpen(true);
  }, [isLoading, hasKey]);

  function close() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  }

  return { isOpen, close };
}
