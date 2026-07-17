"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Plus, Trash2, X } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { Input, Select } from "@/components/Input";
import { StatusBanner } from "@/components/StatusBanner";
import type { useAlerts } from "@/hooks/useAlerts";
import { timeAgo } from "@/lib/utils";
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

const STATUS_META: Record<string, { label: string; tone: BadgeTone; className?: string }> = {
  active: { label: "Watching", tone: "neutral" },
  triggered: { label: "Triggered", tone: "brand" },
  dismissed: { label: "Dismissed", tone: "neutral", className: "text-ink-faint" },
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
    <Dialog isOpen={isOpen} onClose={onClose} variant="drawer" labelledBy="alerts-panel-title" className="max-w-[400px]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand/10">
            <Bell size={16} className="text-brand" />
          </div>
          <div className="min-w-0">
            <p id="alerts-panel-title" className="text-sm font-semibold text-ink">
              Alerts
            </p>
            <p className="truncate text-xs text-ink-faint">{symbol}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close alerts">
          <X size={16} />
        </Button>
      </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="space-y-3 border-b border-border p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">New alert</p>
              <div>
                <label htmlFor="alert-condition" className="mb-1.5 block text-xs font-medium text-ink-muted">
                  Notify me when
                </label>
                <Select
                  id="alert-condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AlertCondition)}
                >
                  {(Object.keys(CONDITION_LABELS) as AlertCondition[]).map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </div>

              {(needsThreshold || optionalThreshold) && (
                <div>
                  <label htmlFor="alert-threshold" className="mb-1.5 block text-xs font-medium text-ink-muted">
                    {needsThreshold ? "Price level" : "RSI threshold"}
                    {optionalThreshold && <span className="ml-1 font-normal text-ink-faint">(optional)</span>}
                  </label>
                  <Input
                    id="alert-threshold"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder={
                      needsThreshold ? "e.g. 250.00" : condition === "rsi_overbought" ? "Default 70" : "Default 30"
                    }
                  />
                </div>
              )}

              {!needsThreshold && !optionalThreshold && (
                <p className="text-xs leading-relaxed text-ink-faint">
                  Triggers the next time {symbol}'s{" "}
                  {condition === "signal_change" ? "model signal" : "risk level"} differs from what it is right now.
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={needsThreshold && !threshold.trim()}
                className="w-full"
              >
                {!isSubmitting && <Plus size={14} aria-hidden />}
                {isSubmitting ? "Creating..." : "Create alert"}
              </Button>
            </form>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {isLoading && alerts.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-ink-faint">
                  <Loader2 size={13} className="animate-spin" />
                  Loading alerts...
                </div>
              )}

              {!isLoading && alerts.length === 0 && !error && (
                <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-border px-4 py-8 text-center">
                  <Bell size={18} className="text-ink-faint" aria-hidden />
                  <p className="text-xs font-medium text-ink-muted">No alerts for {symbol} yet</p>
                  <p className="max-w-[240px] text-xs leading-relaxed text-ink-faint">
                    Create one above and we'll notify you the moment the condition is met.
                  </p>
                </div>
              )}

              {error && <StatusBanner message={error} tone="error" icon="warning" />}

              {alerts.map((alert) => {
                const meta = STATUS_META[alert.status];
                return (
                  <div key={alert.id} className="rounded-sm border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink">
                          {CONDITION_LABELS[alert.condition]}
                          {alert.threshold != null ? ` ${alert.threshold}` : ""}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          {alert.triggered_message ?? "Watching for this condition."}
                        </p>
                        <p className="mt-1 text-2xs text-ink-faint">
                          {alert.status === "triggered" && alert.triggered_at
                            ? `Triggered ${timeAgo(alert.triggered_at)}`
                            : `Created ${timeAgo(alert.created_at)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge size="sm" tone={meta.tone} className={meta.className}>
                          {meta.label}
                        </Badge>
                        <div className="flex items-center gap-0.5">
                          {alert.status === "triggered" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissAlert(alert.id)}
                              className="h-auto px-1.5 py-1 text-2xs text-ink-faint hover:text-ink-muted"
                            >
                              Dismiss
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteAlert(alert.id)}
                            aria-label={`Delete alert: ${CONDITION_LABELS[alert.condition]}`}
                            title="Delete alert"
                            className="h-9 w-9 text-ink-faint hover:bg-bear/10 hover:text-bear"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
      </div>
    </Dialog>
  );
}
