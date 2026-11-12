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

/**
 * The lines of a text from parts (ha-dashboard-kit/joined) as they are on screen: parts on one line are joined by
 * „ · “, a new line is a new item. Without a joined text, the visible text as one item.
 * @param {import("@playwright/test").Locator} locator the joined text or an element around it
 * @returns {Promise<string[]>}
 */
export function joinedLines(locator) {
  return locator.evaluate((element) => {
    const el = element.classList.contains("joined") ? element : element.querySelector(".joined");
    const tidy = (text) => text.replace(/\s+/g, " ").trim();
    if (!el) return [tidy(element.innerText)];
    const lines = [];
    for (const part of el.querySelectorAll(":scope > .joined-part")) {
      const top = Math.round(part.getBoundingClientRect().top);
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - top) <= 1) last.text += ` · ${tidy(part.innerText)}`;
      else lines.push({ top, text: tidy(part.innerText) });
    }
    return lines.map((line) => line.text);
  });
}
