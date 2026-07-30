"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  /** The true, current value - the only thing ever actually displayed at rest. `null`/
   * `undefined` (e.g. a currency conversion rate not loaded yet) skips animation
   * entirely and renders straight through `format`, matching how the app's existing
   * formatters (formatPrice, formatPercent, ...) already render a "--" placeholder
   * for missing data. */
  value: number | null | undefined;
  /** Formats the (possibly mid-tween) numeric value for display, e.g. currency or
   * percent formatting - called on every animation frame, so it must be cheap. */
  format: (value: number | null | undefined) => string;
  className?: string;
  /** Seconds. Short and deliberate: a live price ticking to its new value should read
   * as "smoothly updating," never as a slot-machine count-up - see module docs. */
  duration?: number;
}

// Matches components/Reveal.tsx's easing curve so every piece of orchestrated motion
// in the app (marketing entrances, this) shares the same signature feel.
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Tweens a numeric value smoothly to its new value on change, instead of the display
 * snapping instantly - the live-updating feel is a deliberate trust signal for a
 * market data dashboard (this is genuinely live, continuously-tracked data, not a
 * page that silently jumps between static snapshots).
 *
 * Never animates away from a value the user hasn't actually seen: the very first
 * render shows the true value immediately (no count-up from zero, which would
 * momentarily display numbers with no real meaning) - only a *change* to an
 * already-displayed value animates. Respects prefers-reduced-motion by skipping the
 * tween entirely and jumping straight to the new value.
 */
export function AnimatedNumber({ value, format, className, duration = 0.4 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<number | null | undefined>(value);
  const previousValue = useRef(value);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = value;

    // Nothing to tween between two real numbers - jump straight to the new value
    // (still covers the common "value became/stopped being unavailable" case, e.g. a
    // currency conversion rate loading in or dropping out).
    if (prefersReducedMotion || typeof from !== "number" || typeof value !== "number" || from === value) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(from, value, {
      duration,
      ease: EASE,
      onUpdate: setDisplayValue,
    });
    return () => controls.stop();
  }, [value, duration, prefersReducedMotion]);

  return <span className={className}>{format(displayValue)}</span>;
}
