"use client";

import { useEffect, useState } from "react";

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

export function useChartPreferences() {
  const [prefs, setPrefs] = useState<ChartPreferences>(DEFAULTS);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPrefs({ ...DEFAULTS, ...JSON.parse(stored) });
      } catch {
        // ignore corrupt storage
      }
    }
  }, []);

  const updatePrefs = (patch: Partial<ChartPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { prefs, updatePrefs };
}
