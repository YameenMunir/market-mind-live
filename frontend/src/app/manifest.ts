import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Market Mind Live",
    short_name: "MML",
    description:
      "Live market intelligence for stocks, ETFs, crypto, forex, commodities, and indices - predictions, risk, and backtesting in one terminal.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#090b10",
    theme_color: "#090b10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
