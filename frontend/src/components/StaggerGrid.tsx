"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Matches components/Reveal.tsx's easing curve so every piece of orchestrated motion
// in the app shares the same signature feel.
const EASE = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

interface StaggerGridProps {
  children: ReactNode;
  /** Changing this value (e.g. the selected symbol) re-triggers the entrance
   * sequence via React's key-remount behavior - switching assets reads as "fresh
   * data arriving" rather than the grid just silently re-rendering in place. */
  resetKey: string;
  className?: string;
  /** Forwarded as `data-tour` - see components/Panel.tsx's identical convention
   * (OnboardingTour.tsx locates steps by this attribute). */
  dataTour?: string;
}

/** Staggers the entrance of each direct `<StaggerItem>` child by a fixed delay - one
 * orchestrated moment (per frontend-design guidance, this reads as more deliberate
 * than each card fading in independently on its own schedule) instead of the grid
 * just appearing inertly. A no-op wrapper (no motion, no remount) when the user has
 * requested reduced motion. */
export function StaggerGrid({ children, resetKey, className, dataTour }: StaggerGridProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className={className} data-tour={dataTour}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={resetKey}
      data-tour={dataTour}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/** One staggered child of a `<StaggerGrid>` - a plain, unstyled wrapper (all layout
 * classes stay on the actual card component/StaggerGrid) so it's transparent to the
 * parent's CSS grid. */
export function StaggerItem({ children }: { children: ReactNode }) {
  return <motion.div variants={itemVariants}>{children}</motion.div>;
}
