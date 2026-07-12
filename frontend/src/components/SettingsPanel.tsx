"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Check, KeyRound, Moon, Sun } from "lucide-react";

import { Button } from "@/components/Button";
import { GeminiKeySetupModal } from "@/components/GeminiKeySetupModal";
import { Input } from "@/components/Input";
import { Toggle } from "@/components/Toggle";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import { useTheme } from "@/hooks/useTheme";
import { useUserSettings } from "@/hooks/useUserSettings";
import { API_BASE_URL, INDICATOR_POLL_MS, QUOTE_POLL_FALLBACK_MS, SUPPORTED_CURRENCIES, WS_BASE_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

function SettingsSection({ eyebrow, title, children }: SettingsSectionProps) {
  return (
    <div className="border-b border-border p-4 last:border-b-0 sm:p-5">
      <p className="font-mono text-2xs uppercase font-bold tracking-wider text-ink-faint">{eyebrow}</p>
      <h2 className="mt-0.5 font-mono text-xs uppercase font-bold text-ink border-b border-border/30 pb-1.5">{title}</h2>
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const { prefs, updatePrefs } = useChartPreferences();
  const { currency, setCurrency } = useCurrencyContext();
  const { experienceMode, setExperienceMode } = useUserSettings();
  const geminiKey = useGeminiKey();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveKey = async () => {
    setIsRemoving(true);
    try {
      await geminiKey.remove();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="rounded-sm border border-border bg-surface">
      <SettingsSection eyebrow="AI Insights" title="Gemini API key">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-brand/25 bg-brand/5">
              <KeyRound size={15} className="text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              {geminiKey.status.has_key ? (
                <>
                  <p className="truncate font-mono text-xs text-ink">{geminiKey.status.masked_key}</p>
                  <p className="text-xs text-ink-faint">Live Gemini responses are enabled for this browser.</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-ink">Not configured</p>
                  <p className="text-xs text-ink-faint">
                    AI Insights is using the built-in offline assistant. Add your own key for live Gemini responses.
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {geminiKey.status.has_key && (
              <Button variant="ghost" size="sm" onClick={handleRemoveKey} loading={isRemoving}>
                Remove
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setIsKeyModalOpen(true)}>
              {geminiKey.status.has_key ? "Replace key" : "Add key"}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Dashboard" title="Experience level">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Experience level">
          <button
            onClick={() => setExperienceMode("simple")}
            aria-pressed={experienceMode === "simple"}
            className={cn(
              "flex flex-col items-start gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
              experienceMode === "simple"
                ? "border-brand/40 bg-brand/5 text-ink font-semibold"
                : "border-border text-ink-muted hover:border-ink-faint/40 hover:bg-surface"
            )}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Simple</span>
            <span className="text-xs text-ink-muted">Price, prediction, chart, and a one-line summary only.</span>
          </button>
          <button
            onClick={() => setExperienceMode("advanced")}
            aria-pressed={experienceMode === "advanced"}
            className={cn(
              "flex flex-col items-start gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
              experienceMode === "advanced"
                ? "border-brand/40 bg-brand/5 text-ink font-semibold"
                : "border-border text-ink-muted hover:border-ink-faint/40 hover:bg-surface"
            )}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Advanced</span>
            <span className="text-xs text-ink-muted">Full dashboard: indicators, risk, analyst consensus, and more.</span>
          </button>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Appearance" title="Theme">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Theme">
          <button
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={cn(
              "flex items-center gap-2 rounded-sm border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors",
              theme === "dark"
                ? "border-brand/40 bg-brand/5 text-ink"
                : "border-border text-ink-muted hover:border-ink-faint/40 hover:bg-surface"
            )}
          >
            <Moon size={14} aria-hidden /> Dark mode
          </button>
          <button
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={cn(
              "flex items-center gap-2 rounded-sm border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors",
              theme === "light"
                ? "border-brand/40 bg-brand/5 text-ink"
                : "border-border text-ink-muted hover:border-ink-faint/40 hover:bg-surface"
            )}
          >
            <Sun size={14} aria-hidden /> Light mode
          </button>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Chart Defaults" title="Overlays">
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
      </SettingsSection>

      <SettingsSection eyebrow="Display" title="Currency">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Display currency">
          {SUPPORTED_CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCurrency(c.code)}
              aria-pressed={currency === c.code}
              className={cn(
                "flex items-center justify-between gap-2 rounded-sm border px-3 py-2.5 text-left font-mono text-xs font-bold uppercase tracking-wider transition-colors",
                currency === c.code
                  ? "border-brand/40 bg-brand/5 text-ink"
                  : "border-border text-ink-muted hover:border-ink-faint/40 hover:bg-surface"
              )}
            >
              <span>
                <span className="text-ink-faint font-semibold">{c.symbol}</span> {c.code}
              </span>
              {currency === c.code && <Check size={13} className="shrink-0 text-brand" aria-hidden />}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Prices, charts, predictions, and backtests are converted to this currency using a live FX rate. Numbers
          are still calculated from the asset's native-currency data - only the display is converted.
        </p>
      </SettingsSection>

      <SettingsSection eyebrow="Default Asset" title="Startup symbol">
        <label htmlFor="settings-default-symbol" className="sr-only">
          Startup symbol
        </label>
        <Input
          id="settings-default-symbol"
          value={prefs.defaultSymbol}
          onChange={(e) => updatePrefs({ defaultSymbol: e.target.value.toUpperCase() })}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono text-xs uppercase"
          placeholder="AAPL"
        />
        <p className="mt-2 text-xs text-ink-muted">The dashboard will load this symbol on your next visit.</p>
      </SettingsSection>

      <SettingsSection eyebrow="Connection" title="Data & refresh">
        <div className="divide-y divide-border/60 border border-border bg-surface-raised/40">
          <div className="flex items-center justify-between gap-4 p-2.5 sm:px-4">
            <span className="shrink-0 font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">API endpoint</span>
            <span className="break-all text-right font-mono text-xs text-ink-muted">{API_BASE_URL}</span>
          </div>
          <div className="flex items-center justify-between gap-4 p-2.5 sm:px-4">
            <span className="shrink-0 font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">WebSocket endpoint</span>
            <span className="break-all text-right font-mono text-xs text-ink-muted">{WS_BASE_URL}</span>
          </div>
          <div className="flex items-center justify-between gap-4 p-2.5 sm:px-4">
            <span className="shrink-0 font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">Quote polling fallback</span>
            <span className="shrink-0 font-mono text-xs text-ink-muted">{QUOTE_POLL_FALLBACK_MS / 1000}s</span>
          </div>
          <div className="flex items-center justify-between gap-4 p-2.5 sm:px-4">
            <span className="shrink-0 font-mono text-2xs font-bold uppercase tracking-wider text-ink-faint">Indicator / prediction refresh</span>
            <span className="shrink-0 font-mono text-xs text-ink-muted">{INDICATOR_POLL_MS / 1000}s</span>
          </div>
        </div>
      </SettingsSection>

      <GeminiKeySetupModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} allowSkip cancelLabel="Cancel" />
    </div>
  );
}
