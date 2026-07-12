import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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

const THEME_INIT_SCRIPT = `
  try {
    var stored = window.localStorage.getItem('mml-theme');
    var theme = stored === 'light' ? 'light' : 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
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
