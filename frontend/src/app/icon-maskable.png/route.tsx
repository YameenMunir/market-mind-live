import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// Maskable variant of the brand mark (see icon.tsx / BrandMark.tsx): background fills the
// full canvas edge-to-edge and the mark is scaled into the ~80% "safe zone" Android/adaptive
// icon masking expects, since OS launchers crop maskable icons to a circle/squircle/etc.
export function GET() {
  return new ImageResponse(
    (
      <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="#f5a623" />
        <path
          d="M145.62 327.12 L216.58 240.23 L271.77 295.42 L366.38 177.15"
          stroke="#07090e"
          strokeWidth="33.12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="366.38" cy="177.15" r="28.38" fill="#07090e" />
      </svg>
    ),
    { width: 512, height: 512 }
  );
}
