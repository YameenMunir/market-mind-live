"use client";

import { useEffect } from "react";

// Registered only in production - a service worker persisting across dev-server restarts is
// a common source of confusing "why is my change not showing up" bugs during local development.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement - a failed registration shouldn't affect
      // the rest of the app.
    });
  }, []);

  return null;
}
