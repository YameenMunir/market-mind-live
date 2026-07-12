"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";

import { Button } from "@/components/Button";
import type { OnboardingTourState } from "@/hooks/useOnboardingTour";

interface OnboardingTourProps {
  tour: OnboardingTourState;
}

const POPOVER_WIDTH = 320;
const POPOVER_GAP = 12;
const ESTIMATED_POPOVER_HEIGHT = 200;
const VIEWPORT_MARGIN = 16;

interface PopoverPosition {
  top: number;
  left: number;
}

interface DisplayRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
}

/** Clamps a target's rect to the visible viewport (and caps its height) before it's used
 * for either the highlight box or the popover placement math - a target taller than the
 * viewport (e.g. the full indicator panel) would otherwise report a rect extending far
 * above/below the screen, making both the drawn box and the "does it fit above/below"
 * calculation nonsensical. */
function getDisplayRect(rect: DOMRect): DisplayRect {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const top = Math.max(rect.top, 0);
  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.right, viewportWidth);
  // Cap short of the full viewport so there's always room to place the popover below
  // (or above) the box, even when the underlying element is taller than the screen.
  const maxHeight = viewportHeight - ESTIMATED_POPOVER_HEIGHT - POPOVER_GAP - VIEWPORT_MARGIN * 2;
  const height = Math.min(Math.min(rect.bottom, viewportHeight) - top, maxHeight);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(height, 0), bottom: top + height };
}

/** First-run spotlight tour: dims the page, cuts a highlighted box around the current
 * step's target (found via its `data-tour` attribute), and shows a popover describing it.
 * Renders nothing when the tour isn't active. The whole overlay is a single
 * AnimatePresence child so closing (skip/finish) gets a real fade-out instead of an
 * abrupt unmount. */
export function OnboardingTour({ tour }: OnboardingTourProps) {
  const { isActive, step, stepIndex, totalSteps, isLastStep, next, back, skip } = tour;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!isActive) {
      setRect(null);
      return;
    }
    const target = document.querySelector(step.selector);
    if (!target) {
      // This step's target isn't currently rendered (e.g. the indicator panel is
      // hidden in Simple mode) - skip forward instead of leaving the tour stuck with
      // nothing visible to click. `next()` on the last step ends the tour, so this
      // can't loop forever even if every remaining target were missing.
      setRect(null);
      next();
      return;
    }

    const updateRect = () => setRect(target.getBoundingClientRect());
    updateRect();
    // "start" (not "center") keeps this sane for targets taller than the viewport (e.g.
    // the indicator panel) - centering one would push its top far above the viewport,
    // leaving nothing sensible to draw a highlight box or place the popover around.
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    // Re-measure once the smooth scroll has had time to settle.
    const settleTimer = setTimeout(updateRect, 450);

    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(target);
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      clearTimeout(settleTimer);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [isActive, step, next]);

  useEffect(() => {
    if (!isActive) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") skip();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, skip]);

  const displayRect = rect ? getDisplayRect(rect) : null;
  const visible = isActive && displayRect !== null;
  const position = displayRect ? computePopoverPosition(displayRect, step.placement) : null;

  return (
    <AnimatePresence>
      {visible && displayRect && position && (
        <motion.div
          key="onboarding-tour"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="fixed inset-0 z-[80]" onClick={skip} aria-hidden />
          <div
            className="pointer-events-none fixed z-[80] rounded-lg border-2 border-brand transition-[top,left,width,height] duration-200"
            style={{
              top: displayRect.top - 4,
              left: displayRect.left - 4,
              width: displayRect.width + 8,
              height: displayRect.height + 8,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={step.title}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[81] rounded-xl border border-border bg-surface-raised p-4 text-left shadow-panel"
            style={{ top: position.top, left: position.left, width: POPOVER_WIDTH, maxWidth: "calc(100vw - 2rem)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Step {stepIndex + 1} of {totalSteps}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-ink">{step.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{step.body}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={skip}>
                Skip
              </Button>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <Button variant="secondary" size="sm" onClick={back}>
                    Back
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={next}>
                  {isLastStep ? "Finish" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function computePopoverPosition(rect: DisplayRect, placement: "top" | "bottom"): PopoverPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top: number;
  const fitsBelow = rect.bottom + POPOVER_GAP + ESTIMATED_POPOVER_HEIGHT <= viewportHeight;
  const fitsAbove = rect.top - POPOVER_GAP - ESTIMATED_POPOVER_HEIGHT >= 0;
  const placeBelow = placement === "bottom" ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;

  if (placeBelow) {
    top = rect.bottom + POPOVER_GAP;
  } else {
    top = Math.max(VIEWPORT_MARGIN, rect.top - POPOVER_GAP - ESTIMATED_POPOVER_HEIGHT);
  }

  const idealLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - POPOVER_WIDTH - VIEWPORT_MARGIN);
  const left = Math.min(Math.max(idealLeft, VIEWPORT_MARGIN), maxLeft);

  return { top, left };
}
