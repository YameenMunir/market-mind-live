import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export const FIELD_BASE_CLASSES =
  "w-full rounded-lg border border-border bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors duration-150 focus:border-brand/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Standard text/number/search field - consolidates the `h-10 rounded-lg border ...`
 * classes duplicated across SettingsPanel, AlertsPanel, and the backtesting form. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD_BASE_CLASSES, "h-10", className)} {...props} />;
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  return <textarea ref={ref} className={cn(FIELD_BASE_CLASSES, "min-h-[40px] py-2.5", className)} {...props} />;
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Native `<select>` styled to match Input, with a themed chevron overlay (native selects
 * can't be styled directly, so the browser's own arrow is hidden via appearance-none). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(FIELD_BASE_CLASSES, "h-10 cursor-pointer appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
      />
    </div>
  );
});
