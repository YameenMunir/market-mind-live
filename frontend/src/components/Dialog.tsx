"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type DialogVariant = "drawer" | "centered" | "cover";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  variant: DialogVariant;
  /** id of the element (rendered inside `children`) that names this dialog for
   * assistive tech - required so `aria-labelledby` always points at real content
   * instead of duplicating a label here. */
  labelledBy: string;
  children: ReactNode;
  /** Panel-level className - width/max-width for `drawer`, width for `centered`. */
  className?: string;
  closeOnEscape?: boolean;
  closeOnScrimClick?: boolean;
  /** `drawer` only: whether the scrim (and its implied "modal" affordance) also
   * shows at `lg`+ widths, or only on mobile where the drawer covers more of the
   * screen. Defaults to mobile-only, matching the panels this was extracted from. */
  scrimOnDesktop?: boolean;
  /** Bumps this dialog above the standard 40/50 scrim/panel tier (z-60/70) for a
   * dialog that must sit above other already-open UI - see DESIGN_SYSTEM.md's
   * z-index scale. */
  elevated?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Shared overlay shell for every modal/drawer in the app - owns the parts that are
 * easy to get subtly wrong and expensive to duplicate correctly four times: focus
 * trapping, returning focus to the trigger on close, Escape-to-close, `role="dialog"`/
 * `aria-modal`, and a consistent scrim. Visual chrome (header, body, footer) is left
 * entirely to the caller via `children` - this only owns positioning/motion/scrim,
 * which is what actually varies between a side drawer, a centered dialog, and a
 * full-viewport takeover. */
export function Dialog({
  isOpen,
  onClose,
  variant,
  labelledBy,
  children,
  className,
  closeOnEscape = true,
  closeOnScrimClick = true,
  scrimOnDesktop = false,
  elevated = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? panel)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (closeOnEscape) onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, variant, closeOnEscape]);

  const scrimZ = elevated ? "z-[60]" : "z-40";
  const panelZ = elevated ? "z-[70]" : "z-50";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {variant !== "cover" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("fixed inset-0 bg-black/50", scrimZ, variant === "drawer" && !scrimOnDesktop && "lg:hidden")}
              onClick={closeOnScrimClick ? onClose : undefined}
              aria-hidden
            />
          )}

          {variant === "drawer" && (
            <motion.div
              ref={panelRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              tabIndex={-1}
              className={cn(
                "fixed inset-y-0 right-0 flex w-full flex-col border-l border-border bg-surface shadow-panel outline-none",
                panelZ,
                className
              )}
            >
              {children}
            </motion.div>
          )}

          {variant === "centered" && (
            <div className={cn("fixed inset-0 flex items-center justify-center p-4", panelZ)}>
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel outline-none",
                  className
                )}
              >
                {children}
              </motion.div>
            </div>
          )}

          {variant === "cover" && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              tabIndex={-1}
              className={cn("fixed inset-0 z-50 flex flex-col bg-canvas outline-none", className)}
            >
              {children}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
