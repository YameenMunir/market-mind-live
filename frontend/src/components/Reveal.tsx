"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** "load" animates once on mount (above-the-fold content); "scroll" animates the
   * first time the element scrolls into view (below-the-fold sections). */
  trigger?: "load" | "scroll";
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** The one place framer-motion is used on the marketing pages - isolated into its own
 * client component so the pages themselves can stay server components (static
 * marketing copy has no other reason to ship as client-side JS) instead of the whole
 * page opting into "use client" just for a handful of entrance animations. */
export function Reveal({ children, delay = 0, className, trigger = "load" }: RevealProps) {
  // framer-motion's initial/animate/whileInView props drive transforms via JS,
  // which the global CSS prefers-reduced-motion rule (globals.css) can't reach -
  // useReducedMotion() is framer-motion's own hook for the same media query.
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 };
  const transition = prefersReducedMotion ? { duration: 0 } : { delay, duration: 0.5, ease: EASE };

  if (trigger === "scroll") {
    return (
      <motion.div
        initial={initial}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div initial={initial} animate={{ opacity: 1, y: 0 }} transition={transition} className={className}>
      {children}
    </motion.div>
  );
}
