"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/Button";

/** Route-level error boundary. Without this, a render error anywhere in the app
 * produced a blank white page with no way back - see also `global-error.tsx`, which
 * covers failures in the root layout itself. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the browser console for local debugging; the digest is the only
    // identifier available for a production build's minified stack.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-sm border border-border bg-surface p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-bear/10">
          <AlertTriangle size={20} className="text-bear" aria-hidden />
        </div>
        <h1 className="mt-4 font-mono text-sm font-bold uppercase tracking-wide text-ink">Something broke on this page</h1>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          The rest of the app is still running. Try loading this page again - if it keeps failing, your other dashboards
          are unaffected.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-2xs uppercase tracking-wide text-ink-faint">Reference: {error.digest}</p>
        )}
        <Button variant="primary" size="lg" onClick={reset} className="mt-5 w-full">
          <RotateCcw size={14} aria-hidden />
          Try again
        </Button>
      </div>
    </main>
  );
}
