"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DropdownRenderProps {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

interface DropdownProps {
  /** Render prop for the trigger button - receives open state so the caller can wire
   * `aria-expanded`/an open/close icon without Dropdown dictating the trigger's markup. */
  trigger: (props: DropdownRenderProps) => ReactNode;
  /** Render prop for the panel content - receives `close` so an item's onClick can
   * dismiss the menu after acting. */
  children: (props: DropdownRenderProps) => ReactNode;
  panelRole?: "menu" | "listbox";
  panelLabel: string;
  panelClassName?: string;
  align?: "left" | "right";
  containerClassName?: string;
  /** Forwarded to the outer container div - e.g. for `data-tour` onboarding-step
   * targeting, which measures this element's bounding rect directly. */
  "data-tour"?: string;
}

/** Shared floating-menu primitive - owns open/close state, the outside-click
 * catcher, Escape-to-close, and panel positioning/chrome. Extracted after
 * CurrencySelector and DashboardViewMenu each independently reimplemented this
 * ~40-line pattern. Not built on the `Dialog` primitive: a dropdown doesn't scrim
 * the page, doesn't trap focus, and closes on any outside click rather than only
 * a dedicated close button - a materially different interaction, not a variant of
 * the same one. */
export function Dropdown({
  trigger,
  children,
  panelRole = "menu",
  panelLabel,
  panelClassName,
  align = "right",
  containerClassName,
  "data-tour": dataTour,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((v) => !v);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const renderProps: DropdownRenderProps = { isOpen, toggle, close };

  return (
    <div ref={containerRef} data-tour={dataTour} className={cn("relative", containerClassName)}>
      {trigger(renderProps)}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
          <div
            role={panelRole}
            aria-label={panelLabel}
            className={cn(
              "animate-dropdown-in absolute z-50 mt-2 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-popover ring-1 ring-black/20",
              align === "right" ? "right-0" : "left-0",
              panelClassName
            )}
          >
            {children(renderProps)}
          </div>
        </>
      )}
    </div>
  );
}
