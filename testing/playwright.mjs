// Playwright configuration of a card: Chromium (iPhone 14 Pro viewport 393 × 852, cs-CZ, Prague);
// WebKit, closer to Safari, runs when installed (`npx playwright install webkit`) and
// PW_WEBKIT=1 is set. The coverage run (testing/coverage.mjs) uses its own port (CARD_PORT) and
// a build with a source map (CARD_BUNDLE).
//   playwright.config.ts of a card:
//     import { cardPlaywrightConfig } from "ha-dashboard-kit/testing/playwright.mjs";
//     export default cardPlaywrightConfig({ port: 4174 });
import { defineConfig, devices } from "@playwright/test";

/** @param {{ port: number, testDir?: string }} options */
export function cardPlaywrightConfig({ port: defaultPort, testDir = "tests" }) {
  const port = Number(process.env.CARD_PORT ?? defaultPort);
  const viewport = { width: 393, height: 852 };
  return defineConfig({
    testDir,
    fullyParallel: true,
    reporter: [["list"]],
    use: { baseURL: `http://127.0.0.1:${port}`, locale: "cs-CZ", timezoneId: "Europe/Prague", viewport },
    webServer: {
      command: "node tests/server.mjs",
      url: `http://127.0.0.1:${port}/tests/harness.html`,
      reuseExistingServer: !process.env.CI && !process.env.CARD_BUNDLE,
      env: { ...process.env, PORT: String(port) },
    },
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"], viewport } },
      ...(process.env.PW_WEBKIT ? [{ name: "webkit", use: { ...devices["Desktop Safari"], viewport } }] : []),
    ],
  });
}
