import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2.5 whitespace-nowrap", className)}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="26" height="26" rx="7" className="fill-brand" />
        <path
          d="M6 17.5L10.5 12L14 15.5L20 8"
          stroke="rgb(var(--color-canvas))"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="8" r="1.8" className="fill-canvas" />
      </svg>
      {/* Icon-only below 400px so the navbar row (logo + theme toggle + Launch +
       * hamburger) fits without compressing touch targets; full wordmark from
       * 400px up, where there's room for it. */}
      <span className="hidden font-sans text-[15px] font-semibold tracking-tight text-ink min-[400px]:inline">
        Market Mind <span className="text-brand">Live</span>
      </span>
    </div>
  );
}
