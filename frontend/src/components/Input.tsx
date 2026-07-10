import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// The shared visual shape of "a form-field-like container" - border/radius/background
// only, with no assumptions about whether the focusable element is this node itself
// (Input/Textarea/Select) or a child of it (AssetSearch's icon+input+kbd wrapper,
// which needs `focus-within` instead of `focus`). Both derive from this one constant
// so the two never drift apart visually.
export const FIELD_CHROME_CLASSES = "rounded-lg border border-border bg-surface-raised transition-colors duration-150";

export const FIELD_BASE_CLASSES =
  `w-full ${FIELD_CHROME_CLASSES} px-3 text-sm text-ink placeholder:text-ink-faint ` +
  "focus:border-brand/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40";

// Applied instead of the default border when a field has a validation error - kept
// as one shared constant so Input/Textarea/Select stay in sync.
const FIELD_ERROR_CLASSES = "border-bear/60 focus:border-bear";

interface FieldErrorProps {
  id: string;
  error?: string;
}

function FieldError({ id, error }: FieldErrorProps) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-bear">
      {error}
    </p>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: string };

/** Standard text/number/search field - consolidates the `h-10 rounded-lg border ...`
 * classes duplicated across SettingsPanel, AlertsPanel, and the backtesting form.
 * Pass `error` to show a validation message and switch the field to its invalid
 * state (bear-colored border, `aria-invalid`, `aria-describedby`). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, id, ...props },
  ref
) {
  const generatedId = useId();
  const errorId = `${id ?? generatedId}-error`;
  return (
    <div>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(FIELD_BASE_CLASSES, "h-10", error && FIELD_ERROR_CLASSES, className)}
        {...props}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, id, ...props },
  ref
) {
  const generatedId = useId();
  const errorId = `${id ?? generatedId}-error`;
  return (
    <div>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(FIELD_BASE_CLASSES, "min-h-[40px] py-2.5", error && FIELD_ERROR_CLASSES, className)}
        {...props}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { error?: string };

/** Native `<select>` styled to match Input, with a themed chevron overlay (native selects
 * can't be styled directly, so the browser's own arrow is hidden via appearance-none). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, id, children, ...props },
  ref
) {
  const generatedId = useId();
  const errorId = `${id ?? generatedId}-error`;
  return (
    <div>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(FIELD_BASE_CLASSES, "h-10 cursor-pointer appearance-none pr-9", error && FIELD_ERROR_CLASSES, className)}
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
      <FieldError id={errorId} error={error} />
    </div>
  );
});
