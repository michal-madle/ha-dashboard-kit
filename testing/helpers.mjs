// Helpers of the browser tests shared by the cards.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Violations of axe-core in the page, as short texts (empty = none). Runs on the page as it is:
 * open the popups and states to check first, and let animations finish.
 * @param {import("@playwright/test").Page} page
 * @param {string[]} [skip] ids of the axe rules to switch off
 * @returns {Promise<string[]>}
 */
export async function axeViolations(page, skip = []) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  return page.evaluate(async (off) => {
    const rules = Object.fromEntries(off.map((id) => [id, { enabled: false }]));
    // @ts-ignore injected above
    const result = await window.axe.run(document, { resultTypes: ["violations"], rules });
    return result.violations.map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => `${node.target.join(" > ")} ${JSON.stringify(node.any[0]?.data ?? {})}`).join(" | ")}`,
    );
  }, skip);
}
