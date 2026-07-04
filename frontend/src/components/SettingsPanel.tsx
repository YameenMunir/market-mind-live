"use client";

import { Moon, Sun } from "lucide-react";

import { Panel } from "@/components/Panel";
import { Toggle } from "@/components/Toggle";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useTheme } from "@/hooks/useTheme";
import { API_BASE_URL, INDICATOR_POLL_MS, QUOTE_POLL_FALLBACK_MS, WS_BASE_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const { prefs, updatePrefs } = useChartPreferences();

  return (
    <div className="flex flex-col gap-5">
      <Panel eyebrow="Appearance" title="Theme">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Theme">
          <button
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
              theme === "dark"
                ? "border-brand bg-brand/10 text-ink"
                : "border-border text-ink-muted hover:border-ink-faint/40 hover:text-ink"
            )}
          >
            <Moon size={16} aria-hidden /> Dark mode
          </button>
          <button
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
              theme === "light"
                ? "border-brand bg-brand/10 text-ink"
                : "border-border text-ink-muted hover:border-ink-faint/40 hover:text-ink"
            )}
          >
            <Sun size={16} aria-hidden /> Light mode
          </button>
        </div>
      </Panel>

      <Panel eyebrow="Chart Defaults" title="Overlays">
        <div className="divide-y divide-border">
          <Toggle
            checked={prefs.showMovingAverages}
            onChange={(v) => updatePrefs({ showMovingAverages: v })}
            label="Moving averages"
            description="Show SMA 20 / SMA 50 overlays on the live chart by default."
          />
          <Toggle
            checked={prefs.showBollinger}
            onChange={(v) => updatePrefs({ showBollinger: v })}
            label="Bollinger Bands"
            description="Show volatility bands overlay on the live chart by default."
          />
        </div>
      </Panel>

      <Panel eyebrow="Default Asset" title="Startup symbol">
        <label htmlFor="settings-default-symbol" className="sr-only">
          Startup symbol
        </label>
        <input
          id="settings-default-symbol"
          value={prefs.defaultSymbol}
          onChange={(e) => updatePrefs({ defaultSymbol: e.target.value.toUpperCase() })}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-10 w-full rounded-lg border border-border bg-surface-raised px-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-brand/60 focus:outline-none"
          placeholder="AAPL"
        />
        <p className="mt-2 text-xs text-ink-muted">The dashboard will load this symbol on your next visit.</p>
      </Panel>

      <Panel eyebrow="Connection" title="Data & refresh">
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="shrink-0 text-ink-faint">API endpoint</span>
            <span className="break-all text-right font-mono text-ink-muted">{API_BASE_URL}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="shrink-0 text-ink-faint">WebSocket endpoint</span>
            <span className="break-all text-right font-mono text-ink-muted">{WS_BASE_URL}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="shrink-0 text-ink-faint">Quote polling fallback</span>
            <span className="shrink-0 font-mono text-ink-muted">{QUOTE_POLL_FALLBACK_MS / 1000}s</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="shrink-0 text-ink-faint">Indicator / prediction refresh</span>
            <span className="shrink-0 font-mono text-ink-muted">{INDICATOR_POLL_MS / 1000}s</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
