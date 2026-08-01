"use client";

/** Last-resort boundary for failures in the root layout itself, which `error.tsx`
 * cannot catch. Next.js replaces the entire document here, so this must render its
 * own <html>/<body> and cannot rely on the app's providers, fonts, or Tailwind
 * layer being available - hence the inline styles. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#090b10",
          color: "#f1f3f7",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Market Mind Live could not start
          </h1>
          <p style={{ fontSize: "0.8125rem", lineHeight: 1.6, color: "#94a3b8" }}>
            The application failed to load. Reloading usually resolves this.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.6875rem", color: "#64748b" }}>Reference: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.625rem 1.25rem",
              backgroundColor: "#f59e0b",
              color: "#090b10",
              border: "none",
              borderRadius: "2px",
              fontFamily: "inherit",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
