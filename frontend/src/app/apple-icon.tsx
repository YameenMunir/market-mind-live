import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own corner rounding, so this fills the full square (no external padding)
// unlike icon.tsx's rounded-rect mark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="180" height="180" fill="#f5a623" />
        <path
          d="M42 121.2L72.7 83.1L96.9 107.3L138.5 55.4"
          stroke="#07090e"
          strokeWidth="14.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="138.5" cy="55.4" r="12.5" fill="#07090e" />
      </svg>
    ),
    { ...size }
  );
}
