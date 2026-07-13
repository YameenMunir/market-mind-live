import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "@/styles/globals.css";

// Geometric, slightly technical - reads as precision instrumentation rather than a
// generic humanist sans (see DESIGN_SYSTEM.md's "Direction" section). Replaces Inter,
// which the design system deliberately moved away from for this reason.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Market Mind Live | Market Intelligence Terminal",
  description:
    "Live market intelligence for stocks, ETFs, crypto, forex, commodities, and indices - predictions, risk, and backtesting in one terminal.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Market Mind Live",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090b10",
};

// Canvas hex values must stay in sync with --color-canvas in styles/globals.css
// (dark: rgb(9 11 16), light: rgb(248 250 252)) - duplicated here rather than shared
// from one source, since this runs as an inline pre-hydration script (plain JS
// string, not importable TS) and useTheme.ts's toggle handler (a separate runtime
// context) both need the same values to keep the OS/browser chrome's theme-color
// meta tag in sync with whichever theme is actually active, not just the default
// dark value baked into the initial SSR-rendered <meta> (see viewport.themeColor
// below) - without this, switching to light mode leaves the address bar/PWA title
// bar tinted dark even though the in-app UI is now light.
const THEME_INIT_SCRIPT = `
  try {
    var stored = window.localStorage.getItem('mml-theme');
    var theme;
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else {
      // No explicit choice saved yet (first visit, or storage was cleared) - default
      // to the OS/browser-level preference rather than always forcing dark, so a
      // system-light user's first impression matches what they'd expect. Once they
      // ever toggle in-app, that explicit choice is what persists from then on -
      // this fallback only applies before any choice has been made.
      var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      theme = prefersLight ? 'light' : 'dark';
    }
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#090b10');
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sora.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="min-h-screen bg-canvas font-sans text-ink antialiased"
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
