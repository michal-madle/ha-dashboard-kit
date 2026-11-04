// `test` for the specs of a card. With CARD_COVERAGE set (the coverage run) every test records the
// JavaScript coverage of the card bundle in its page (V8, Chromium only) and writes it to
// coverage/raw/; otherwise it is the plain Playwright `test`.
//   tests/fixtures.ts of a card:
//     import { makeTest } from "ha-dashboard-kit/testing/fixtures.mjs";
//     export const test = makeTest("ha-energie-dashboard.js");
//     export { expect } from "@playwright/test";
//     export type { CDPSession, Locator, Page } from "@playwright/test";
//
// Chromium reports the coverage of the current page only: what an earlier page of the same test
// executed is gone after the next navigation. So the coverage is taken before every `page.goto`.
import { test as base } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

/** @param {string} card file name of the built card, "ha-energie-dashboard.js" */
export function makeTest(card) {
  return base.extend({
    collectCoverage: [
      async ({ page, browserName }, use, testInfo) => {
        if (!process.env.CARD_COVERAGE || browserName !== "chromium") {
          await use();
          return;
        }
        const options = { resetOnNavigation: false };
        const entries = [];
        const take = async () => {
          const all = await page.coverage.stopJSCoverage();
          entries.push(...all.filter((entry) => entry.url.endsWith(`/${card}`)));
        };
        await page.coverage.startJSCoverage(options);
        const goto = page.goto.bind(page);
        page.goto = async (...args) => {
          await take();
          await page.coverage.startJSCoverage(options);
          return goto(...args);
        };
        await use();
        await take();
        await mkdir("coverage/raw", { recursive: true });
        const title = testInfo.titlePath.slice(1).join(" › ");
        await writeFile(`coverage/raw/${testInfo.testId}.json`, JSON.stringify({ title, entries }));
      },
      { auto: true },
    ],
  });
}
