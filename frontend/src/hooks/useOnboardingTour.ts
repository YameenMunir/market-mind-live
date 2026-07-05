"use client";

import { useEffect, useRef, useState } from "react";

import { ONBOARDING_STEPS } from "@/lib/onboardingSteps";

const STORAGE_KEY = "mml-onboarding-seen";
const AUTO_START_DELAY_MS = 600;

/** Drives the first-run dashboard tour: auto-starts once (persisted the same SSR-safe
 * way as useTheme.ts/useChartPreferences.ts - hardcoded initial state, read on mount),
 * and exposes a restart() for the manual "Take the Tour" menu item. */
export function useOnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen === "true") return;
    const timer = setTimeout(() => {
      setStepIndex(0);
      setIsActive(true);
    }, AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function markSeen() {
    window.localStorage.setItem(STORAGE_KEY, "true");
  }

  function next() {
    setStepIndex((i) => {
      if (i >= ONBOARDING_STEPS.length - 1) {
        setIsActive(false);
        markSeen();
        return i;
      }
      return i + 1;
    });
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function skip() {
    setIsActive(false);
    markSeen();
  }

  function restart() {
    setStepIndex(0);
    setIsActive(true);
  }

  return {
    isActive,
    stepIndex,
    step: ONBOARDING_STEPS[stepIndex],
    isLastStep: stepIndex === ONBOARDING_STEPS.length - 1,
    totalSteps: ONBOARDING_STEPS.length,
    next,
    back,
    skip,
    restart,
  };
}

export type OnboardingTourState = ReturnType<typeof useOnboardingTour>;
