"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "mml-theme";

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

/** The <html> class (set synchronously pre-hydration by app/layout.tsx's
 * THEME_INIT_SCRIPT, and kept in sync by applyTheme below) is the single source of
 * truth every useTheme() instance reads - not each hook call's own copy of
 * localStorage. This matters because ThemeToggle and SettingsPanel's own Dark/Light
 * buttons are both rendered at once on /settings: without a shared store, toggling
 * one wouldn't update the other until an unrelated re-render happened to occur. */
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(STORAGE_KEY, theme);

  // Keeps OS/browser chrome (mobile address bar tint, PWA title bar) matching the
  // active theme - see app/layout.tsx's THEME_INIT_SCRIPT for the same values
  // applied pre-hydration, so there's no flash of dark-tinted chrome before this
  // runs on a stored "light" preference.
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", theme === "light" ? "#f8fafc" : "#090b10");

  emitChange();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // True once past the very first (SSR-matching, always "dark") render -
  // useSyncExternalStore guarantees that first client render uses getServerSnapshot
  // regardless of the real persisted choice, self-correcting to the true value
  // immediately after (React docs: "React will also call getSnapshot on the client
  // after hydrating, and if the values differ, React will re-render ... using the
  // values from getSnapshot"). UI that highlights the active theme (ThemeToggle's
  // icon, SettingsPanel's active button) should gate on this rather than trusting
  // `theme` on that first render, or it'll flash the wrong control as active for a
  // stored "light" preference before the self-correction lands.
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  const setTheme = (next: Theme) => applyTheme(next);
  const toggleTheme = () => applyTheme(getSnapshot() === "dark" ? "light" : "dark");

  return { theme, toggleTheme, setTheme, isReady };
}
