const DEVICE_ID_KEY = "mml-device-id";

/** Generates a per-browser device id once and persists it in `localStorage` (unlike
 * the chat session id in `sessionStorage` - see hooks/useAIChat.ts - this needs to
 * survive across tabs and restarts so alerts/chat sessions created on an earlier visit
 * are still recognized as "this browser's" later). Sent as the `X-Device-Id` header on
 * every API call (see lib/api.ts) so the backend can scope alerts/chat sessions per
 * browser without requiring a login. SSR-safe and best-effort, matching the guard
 * pattern already used in hooks/useAIChat.ts and hooks/useTheme.ts. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return "";
  }
}
