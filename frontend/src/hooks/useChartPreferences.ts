"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "mml-chart-prefs";

export interface ChartPreferences {
  showMovingAverages: boolean;
  showBollinger: boolean;
  defaultSymbol: string;
  showPricePredictor: boolean;
  predictionHorizonDays: number;
}

const DEFAULTS: ChartPreferences = {
  showMovingAverages: true,
  showBollinger: true,
  defaultSymbol: "AAPL",
  // Opt-in, unlike MA/Bollinger which default on - this is a more speculative overlay.
  showPricePredictor: false,
  predictionHorizonDays: 7,
};

const listeners = new Set<() => void>();
let currentPrefs: ChartPreferences = DEFAULTS;
let hydrated = false;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

/** Module-level cache, not a fresh JSON.parse(localStorage...) on every call - a
 * useSyncExternalStore snapshot must return a stable reference when nothing has
 * actually changed (React compares with Object.is), so re-parsing localStorage here
 * would make every render look like a "change" and loop forever. Lazily hydrated from
 * localStorage on the first real (client-side) read via the `hydrated` guard - a
 * fresh page load before that point still correctly renders getServerSnapshot()'s
 * DEFAULTS, matching what was server-rendered. */
function getSnapshot(): ChartPreferences {
  if (!hydrated) {
    hydrated = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) currentPrefs = { ...DEFAULTS, ...JSON.parse(stored) };
    } catch {
      // ignore corrupt storage - stays on DEFAULTS
    }
  }
  return currentPrefs;
}

function getServerSnapshot(): ChartPreferences {
  return DEFAULTS;
}

/** The dashboard (which now updates `defaultSymbol` on every asset switch) and the
 * Settings page's preference toggles are both live useChartPreferences() consumers
 * that can be open in different tabs at once - sharing one module-level store here
 * (rather than each hook call keeping its own independent copy) keeps them in sync
 * the moment either one changes something, the same fix already applied to
 * useTheme.ts for the equivalent Topbar/Settings simultaneous-mount case. */
function applyPrefs(patch: Partial<ChartPreferences>): void {
  currentPrefs = { ...getSnapshot(), ...patch };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPrefs));
  emitChange();
}

export function useChartPreferences() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // True once past the very first (SSR-matching, always-DEFAULTS) render - same
  // isReady contract as useTheme.ts. UI that highlights/reflects a saved preference
  // as active (SettingsPanel's Moving Averages/Bollinger Bands toggles, the default-
  // symbol field) should gate on this rather than trusting `prefs` immediately, or
  // it'll flash the DEFAULTS value for a stored preference that actually differs.
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  const updatePrefs = (patch: Partial<ChartPreferences>) => applyPrefs(patch);

  return { prefs, updatePrefs, isReady };
}
