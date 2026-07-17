import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

/** Exported so non-`<button>` elements (e.g. a `<Link>` styled to match) can share the
 * exact same visual variants instead of hand-copying class strings. */
export const BUTTON_VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-canvas hover:bg-brand-strong border border-transparent",
  secondary: "border border-border bg-surface-raised text-ink hover:border-ink-faint/40 hover:bg-surface",
  ghost: "text-ink-muted hover:bg-surface-raised hover:text-ink",
  danger: "border border-bear/30 bg-bear/10 text-bear hover:bg-bear/15",
};

export const BUTTON_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-sm px-2.5 text-xs font-mono font-semibold uppercase tracking-wider",
  md: "h-9 gap-2 rounded-sm px-3.5 text-xs font-mono font-semibold uppercase tracking-wider",
  // 44px: the only size used for primary/hero CTAs and full-width form submits
  // (Navbar, HeroSection, AlertsPanel's "Create alert", backtesting's submit) - the
  // WCAG 2.5.5 touch-target minimum, not just a visual step up from `md`.
  lg: "h-11 gap-2 rounded-sm px-4 text-xs font-mono font-semibold uppercase tracking-wider",
  icon: "h-9 w-9 rounded-sm",
  "icon-sm": "h-8 w-8 rounded-sm",
};

/** Standard interactive button - consolidates the ~8 slightly-different hand-rolled
 * button variants (icon buttons, toolbar buttons, pill toggles, CTAs) that had drifted
 * on padding/radius/hover across the app. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading = false, disabled, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-40",
        BUTTON_VARIANT_STYLES[variant],
        BUTTON_SIZE_STYLES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
