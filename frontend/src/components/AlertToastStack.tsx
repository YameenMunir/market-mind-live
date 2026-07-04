"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";

import type { Alert } from "@/types";

const AUTO_DISMISS_MS = 8000;

interface AlertToastStackProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
}

function Toast({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(alert.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [alert.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="pointer-events-auto flex w-full max-w-80 items-start gap-2.5 rounded-xl border border-brand/30 bg-surface p-3.5 shadow-panel"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10">
        <Bell size={14} className="text-brand" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink">{alert.symbol} alert triggered</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{alert.triggered_message}</p>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        aria-label="Dismiss notification"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink-muted"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

export function AlertToastStack({ alerts, onDismiss }: AlertToastStackProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-4 right-4 top-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:top-6"
    >
      <AnimatePresence>
        {alerts.map((alert) => (
          <Toast key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
