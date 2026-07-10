/** Reads a `--color-*` custom property (defined in styles/globals.css, themed via the
 * `.light`/`.dark` class on `<html>`) and returns it as a `#rrggbb` hex string usable
 * by chart libraries (Recharts, lightweight-charts) that take literal color strings
 * and can't consume CSS custom properties the way Tailwind classes do - hex specifically
 * (not `rgb(...)`) because lightweight-charts' theme table builds translucent variants
 * by string-concatenating a hex alpha suffix (e.g. `color + "80"`), which only produces
 * valid CSS when `color` is already `#rrggbb`. Reading the live token instead of
 * hand-copied hex keeps chart colors from silently drifting out of sync with the rest
 * of the UI when the token values change.
 *
 * Read at render time, not via `getComputedStyle` cached in an effect: the theme class
 * is applied synchronously by a blocking inline script before hydration (see
 * app/layout.tsx's THEME_INIT_SCRIPT), so it already reflects the active theme on
 * first paint - and callers key their memoization on the `theme` prop, so a live
 * toggle still re-reads on the next render these components receive.
 */
export function getThemeColor(token: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim();
  if (!raw) return fallback;
  const channels = raw.split(/\s+/).map(Number);
  if (channels.length !== 3 || channels.some(Number.isNaN)) return fallback;
  return `#${channels.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}
