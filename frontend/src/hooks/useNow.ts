"use client";

import { useEffect, useState } from "react";

/** Ticks every `intervalMs` so components displaying relative time ("5s ago")
 * re-render on a clock instead of only when new data arrives. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
