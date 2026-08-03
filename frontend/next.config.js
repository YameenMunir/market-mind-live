const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Pins Next.js's file-tracing root to this folder explicitly. Without it, Next
  // auto-detects the "workspace root" by walking up for the nearest lockfile - since
  // the repo root also has its own package-lock.json (for the root orchestration
  // scripts - see ../package.json), Next would otherwise guess wrong and warn on
  // every dev/build/start.
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    // Baseline security headers applied to every response. Deliberately no
    // Content-Security-Policy here: Next.js App Router's hydration/inline-script
    // usage needs a nonce-based CSP to lock down safely, which is a larger, riskier
    // change than this pass's scope - getting a CSP subtly wrong silently breaks
    // hydration rather than failing loudly, so it's left as documented future work
    // (see README's Security notes) rather than shipped half-verified.
    return [
      {
        source: "/:path*",
        headers: [
          // Stops the browser from guessing a response's MIME type differently
          // than declared (e.g. treating a JSON/text response as executable).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Blocks this site from being embedded in a third-party <iframe> -
          // clickjacking protection. No legitimate reason for this app to be framed.
          { key: "X-Frame-Options", value: "DENY" },
          // Sends the full referrer only to same-origin requests; cross-origin
          // requests (e.g. an outbound link to a news article) only get the origin,
          // not the full path/query a page was on.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Explicitly opts out of browser features this app never uses.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
