import { defineConfig, devices } from "@playwright/test";

/**
 * Mobile-layout regression suite. Structural checks (overflow, touch-target size,
 * element overlap, axe-core accessibility) at the exact breakpoints called out in
 * the mobile UI/UX spec - a real substitute for eyeballing a browser, which this
 * environment doesn't have.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Real device dimensions (width x common on-device viewport height) rather than
// arbitrary squares, so height-driven checks (e.g. "CTA visible without excessive
// scrolling") reflect what an actual phone shows.
const MOBILE_VIEWPORTS = [
  { name: "320-iphone-se-1st-gen", width: 320, height: 568 },
  { name: "360-android-common", width: 360, height: 740 },
  { name: "375-iphone-se", width: 375, height: 667 },
  { name: "390-iphone-12-13-14", width: 390, height: 844 },
  { name: "430-iphone-pro-max", width: 430, height: 932 },
  { name: "768-ipad-portrait", width: 768, height: 1024 },
];

export default defineConfig({
  testDir: "./e2e",
  // Launching all 6 projects' Chromium instances at once reliably stalled 5 of
  // 6 past the 30s beforeEach timeout in this sandboxed environment (server
  // itself responded in ~100ms to plain curl - it was browser-launch
  // contention, not the app). workers:2 keeps some parallelism without it.
  fullyParallel: false,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }]],
  outputDir: "./e2e/.artifacts/test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: MOBILE_VIEWPORTS.map(({ name, width, height }) => ({
    name,
    use: { ...devices["Desktop Chrome"], viewport: { width, height }, isMobile: width < 768 },
  })),
  // Runs against the production server, not `next dev` - dev's on-demand,
  // per-route compilation stalls badly the moment 6 projects hit it in
  // parallel on first request, which timed out 5 of 6 projects here. The
  // build is already produced by `npm run test:mobile`'s prerequisite step.
  webServer: {
    command: "npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
