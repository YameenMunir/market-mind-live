import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Mirrors the BrandMark.tsx logo mark (chart-trend arrow on the brand-orange square)
// so the browser tab icon matches the in-app logo instead of a generic letter mark.
export default function Icon() {
  return new ImageResponse(
    (
      <svg width="32" height="32" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="26" height="26" rx="7" fill="#f5a623" />
        <path
          d="M6 17.5L10.5 12L14 15.5L20 8"
          stroke="#07090e"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="8" r="1.8" fill="#07090e" />
      </svg>
    ),
    { ...size }
  );
}
