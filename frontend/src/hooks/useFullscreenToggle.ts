"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/** Drives a distraction-free "fullscreen" view for a page section.
 *
 * `isFullscreen` is the source of truth for the CSS-driven layout takeover (a
 * `fixed inset-0` wrapper around `targetRef`'s content) - this always works, on
 * every device. On top of that, `enter`/`exit` best-effort call the native
 * Fullscreen API (`requestFullscreen`/`exitFullscreen`) to also hide the browser
 * chrome where the platform supports it (notably absent on iOS Safari), so the
 * feature degrades gracefully instead of breaking on unsupported browsers. */
export function useFullscreenToggle(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Keeps state in sync when the user exits native fullscreen via the browser's
    // own controls (Escape, F11, swipe-down on mobile) rather than our own button.
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    // Escape always exits, even on platforms where the native Fullscreen API
    // never actually engaged (so no fullscreenchange event will fire for it).
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const enter = useCallback(() => {
    setIsFullscreen(true);
    targetRef.current?.requestFullscreen?.().catch(() => {});
  }, [targetRef]);

  const exit = useCallback(() => {
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return { isFullscreen, enter, exit };
}
