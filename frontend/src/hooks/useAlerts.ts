"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { Alert, AlertCondition } from "@/types";
import { ApiError } from "@/types";

const POLL_MS = 5000;

function notifyBrowser(alert: Alert) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Only bother with a native OS notification when the tab isn't in focus - if the
  // user is already looking at the dashboard, the in-app toast is enough and a
  // duplicate system notification would just be noise.
  if (!document.hidden) return;
  new Notification(`${alert.symbol} alert triggered`, {
    body: alert.triggered_message ?? "One of your alerts just triggered.",
  });
}

/**
 * Polls the backend for this asset's alerts and detects newly-triggered ones (rather
 * than the backend pushing over the WS channel) - alerts are low-frequency, one-shot
 * events, so a lightweight 5s poll is simpler than adding a second push channel for
 * something that isn't part of the high-frequency live snapshot.
 */
export function useAlerts(symbol: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newlyTriggered, setNewlyTriggered] = useState<Alert[]>([]);

  const seenTriggeredIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await api.getAlerts(symbol);
      setError(null);

      const freshlyTriggered = res.alerts.filter(
        (a) => a.status === "triggered" && !seenTriggeredIdsRef.current.has(a.id)
      );
      for (const alert of freshlyTriggered) {
        seenTriggeredIdsRef.current.add(alert.id);
        notifyBrowser(alert);
      }
      if (freshlyTriggered.length > 0) {
        setNewlyTriggered((prev) => [...freshlyTriggered, ...prev]);
      }

      setAlerts(res.alerts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load alerts.");
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    seenTriggeredIdsRef.current = new Set();
    setNewlyTriggered([]);

    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };

    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refresh]);

  const createAlert = useCallback(
    async (condition: AlertCondition, threshold?: number, note?: string) => {
      setError(null);
      try {
        await api.createAlert({ symbol, condition, threshold, note });
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't create that alert.");
        return false;
      }
    },
    [symbol, refresh]
  );

  const deleteAlert = useCallback(
    async (alertId: string) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      try {
        await api.deleteAlert(alertId);
      } catch {
        // Best-effort - a stale entry reappears on the next poll if this failed.
        refresh();
      }
    },
    [refresh]
  );

  const dismissAlert = useCallback(
    async (alertId: string) => {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: "dismissed" } : a)));
      try {
        await api.dismissAlert(alertId);
      } catch {
        refresh();
      }
    },
    [refresh]
  );

  const dismissToast = useCallback((alertId: string) => {
    setNewlyTriggered((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
  }, []);

  return {
    alerts,
    isLoading,
    error,
    newlyTriggered,
    dismissToast,
    createAlert,
    deleteAlert,
    dismissAlert,
    requestNotificationPermission,
  };
}
