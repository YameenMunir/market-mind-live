import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ holds Playwright specs (playwright.config.ts's testDir) - Vitest's
    // default include glob otherwise also picks up *.spec.ts there and fails
    // trying to run @playwright/test imports through jsdom.
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
