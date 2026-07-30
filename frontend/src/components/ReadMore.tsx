"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface ReadMoreProps {
  children: ReactNode;
  /** Pixel height of the collapsed "peek" state - tune per call site to roughly the
   * amount of text that reads as a short summary for that content (e.g. ~6 lines of
   * body copy at this app's type scale is ~96px). */
  collapsedHeight?: number;
  className?: string;
  contentClassName?: string;
  expandLabel?: string;
  collapseLabel?: string;
}

/**
 * Generic "Read more / Show less" disclosure: renders `children` clipped to
 * `collapsedHeight` with a toggle that smoothly expands to the content's full,
 * exact height (measured via ResizeObserver, not a guessed fixed max) and back -
 * avoids both the abrupt cut usually seen with a plain CSS `line-clamp` toggle and
 * the layout-jump/mistimed feel of animating to an arbitrary large max-height.
 *
 * The toggle only renders once content actually overflows the collapsed height, so a
 * short summary that already fits never gets a button that would visibly do nothing.
 * Collapsed content stays in the DOM (only visually clipped, not `display:none` or
 * `aria-hidden`) so screen reader users always get the full text regardless of
 * whether they interact with the (purely visual) expand affordance.
 */
export function ReadMore({
  children,
  collapsedHeight = 96,
  className,
  contentClassName,
  expandLabel = "Read more",
  collapseLabel = "Show less",
}: ReadMoreProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [fullHeight, setFullHeight] = useState(collapsedHeight);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      // scrollHeight reflects the content's natural height regardless of the
      // max-height clip currently applied to this same element.
      const height = el.scrollHeight;
      setFullHeight(height);
      setCanExpand(height > collapsedHeight + 1);
    };

    measure();

    // Re-measures on any content-size change (a fundamentals refresh swapping in a
    // different description, fonts finishing loading, ...). Falls back to a plain
    // window-resize listener where ResizeObserver isn't available (older browsers) -
    // covers the most common cause of a size change even without per-element
    // observation.
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapsedHeight, children]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        id={panelId}
        style={{ maxHeight: expanded ? fullHeight : collapsedHeight }}
        className={cn("overflow-hidden transition-[max-height] duration-300 ease-in-out", contentClassName)}
      >
        {children}
      </div>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="mt-2 inline-flex items-center gap-1 self-start rounded-sm font-mono text-2xs font-bold uppercase tracking-wider text-brand transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <ChevronDown size={12} aria-hidden className={cn("transition-transform duration-300", expanded && "rotate-180")} />
          {expanded ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  );
}
