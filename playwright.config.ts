import { defineConfig, devices } from "@playwright/test";

// Browser tests of the controls on tests/harness.html, served by Vite (TypeScript sources, no build).
const port = 4175;
const viewport = { width: 393, height: 852 };

export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}`, viewport, locale: "en-GB" },
  webServer: {
    command: `npx vite --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}/tests/harness.html`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport } }],
});
