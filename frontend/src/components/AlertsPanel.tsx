"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Loader2, Plus, Trash2, X } from "lucide-react";

import { StatusBanner } from "@/components/StatusBanner";
import type { useAlerts } from "@/hooks/useAlerts";
import { cn, timeAgo } from "@/lib/utils";
import type { AlertCondition } from "@/types";

const CONDITION_LABELS: Record<AlertCondition, string> = {
  price_above: "Price rises above",
  price_below: "Price falls below",
  rsi_overbought: "RSI becomes overbought",
  rsi_oversold: "RSI becomes oversold",
  signal_change: "Model signal changes",
  risk_level_change: "Risk level changes",
};

const NEEDS_THRESHOLD: AlertCondition[] = ["price_above", "price_below"];
const OPTIONAL_THRESHOLD: AlertCondition[] = ["rsi_overbought", "rsi_oversold"];

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: "Watching", className: "bg-surface-raised text-ink-muted" },
  triggered: { label: "Triggered", className: "bg-brand/15 text-brand" },
  dismissed: { label: "Dismissed", className: "bg-surface-raised text-ink-faint" },
};

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  alertsState: ReturnType<typeof useAlerts>;
}

export function AlertsPanel({ isOpen, onClose, symbol, alertsState }: AlertsPanelProps) {
  const { alerts, isLoading, error, createAlert, deleteAlert, dismissAlert, requestNotificationPermission } =
    alertsState;

  const [condition, setCondition] = useState<AlertCondition>("price_above");
  const [threshold, setThreshold] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) requestNotificationPermission();
  }, [isOpen, requestNotificationPermission]);

  const needsThreshold = NEEDS_THRESHOLD.includes(condition);
  const optionalThreshold = OPTIONAL_THRESHOLD.includes(condition);

  const handleCreate = async () => {
    if (needsThreshold && !threshold.trim()) return;
    setIsSubmitting(true);
    const parsedThreshold = threshold.trim() ? Number(threshold) : undefined;
    const ok = await createAlert(condition, parsedThreshold, undefined);
    setIsSubmitting(false);
    if (ok) setThreshold("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-border bg-surface shadow-panel"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <Bell size={16} className="text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">Alerts</p>
                  <p className="truncate text-[11px] text-ink-faint">{symbol}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close alerts"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 border-b border-border p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">New alert</p>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AlertCondition)}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-ink focus:border-brand/60 focus:outline-none"
              >
                {(Object.keys(CONDITION_LABELS) as AlertCondition[]).map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>

              {(needsThreshold || optionalThreshold) && (
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder={
                    needsThreshold ? "Price level" : condition === "rsi_overbought" ? "Threshold (default 70)" : "Threshold (default 30)"
                  }
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand/60 focus:outline-none"
                />
              )}

              {!needsThreshold && !optionalThreshold && (
                <p className="text-[11px] leading-relaxed text-ink-faint">
                  Triggers the next time {symbol}'s{" "}
                  {condition === "signal_change" ? "model signal" : "risk level"} differs from what it is right now.
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={isSubmitting || (needsThreshold && !threshold.trim())}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create alert
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {isLoading && alerts.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-ink-faint">
                  <Loader2 size={13} className="animate-spin" />
                  Loading alerts...
                </div>
              )}

              {!isLoading && alerts.length === 0 && (
                <p className="text-xs leading-relaxed text-ink-faint">
                  No alerts yet for {symbol}. Create one above to get notified when conditions change.
                </p>
              )}

              {error && <StatusBanner message={error} tone="error" icon="warning" />}

              {alerts.map((alert) => {
                const meta = STATUS_META[alert.status];
                return (
                  <div key={alert.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink">
                          {CONDITION_LABELS[alert.condition]}
                          {alert.threshold != null ? ` ${alert.threshold}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                          {alert.triggered_message ?? "Watching for this condition."}
                        </p>
                        <p className="mt-1 text-[10px] text-ink-faint">
                          {alert.status === "triggered" && alert.triggered_at
                            ? `Triggered ${timeAgo(alert.triggered_at)}`
                            : `Created ${timeAgo(alert.created_at)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.className)}>
                          {meta.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {alert.status === "triggered" && (
                            <button
                              onClick={() => dismissAlert(alert.id)}
                              className="text-[10px] font-medium text-ink-faint hover:text-ink-muted"
                            >
                              Dismiss
                            </button>
                          )}
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            aria-label="Delete alert"
                            className="text-ink-faint hover:text-bear"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
