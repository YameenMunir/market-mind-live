import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// Same brand mark as icon.tsx (BrandMark.tsx), rendered at PWA icon size.
export function GET() {
  return new ImageResponse(
    (
      <svg width="512" height="512" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    { width: 512, height: 512 }
  );
}
