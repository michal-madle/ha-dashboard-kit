import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { joinedLines } from "../testing/helpers.mjs";

// CURRENT_SPEC.md, Text z částí: one line with dots, separate lines without them, or one flowing text.

const at = async (page: Page, width: number) => {
  await page.goto("/tests/joined.html");
  await page.waitForFunction(() => (window as any).ready === true);
  await page.locator("joined-test").evaluate((el: any, w) => { el.width = w; return el.updateComplete; }, width);
};
const lines = (page: Page, id: string) => joinedLines(page.locator(`#${id}`));
const form = (page: Page, id: string) => page.locator(`#${id} .joined`).evaluate((el) => (el.classList.contains("flow") ? "flow" : el.classList.contains("stacked") ? "stacked" : "inline"));

test("vejde se: jeden řádek s tečkou, jednotka jen u druhé části", async ({ page }) => {
  await at(page, 400);
  expect(await lines(page, "rows")).toEqual(["Přetoky 60 · Boost 55 °C"]);
  expect(await lines(page, "whole")).toEqual(["Přetoky 60 · Boost 55 °C"]);
  expect(await form(page, "whole")).toBe("inline");
});

test("nevejde se: řádek se zalomí v místě tečky a ta zmizí, „joined-only“ se ukáže", async ({ page }) => {
  await at(page, 110);
  expect(await lines(page, "rows")).toEqual(["Přetoky 60", "Boost 55 °C"]);
  expect(await lines(page, "whole")).toEqual(["Přetoky 60 °C", "Boost 55 °C"]);
});

test("část se nevejde ani na svůj řádek: souvislý text, tečka nezačíná ani nekončí řádek", async ({ page }) => {
  await at(page, 180);
  expect(await form(page, "flow")).toBe("flow");
  // More than one line, and the dot is on the line of the word before it and of the word after it.
  const layout = await page.locator("#flow .joined").evaluate((el) => {
    const text = (part: Element) => { const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT); let node = walker.nextNode(); while (node && !node.textContent!.trim()) node = walker.nextNode(); return node as Text; };
    const [a, b] = [...el.querySelectorAll(".joined-part")].map(text);
    const top = (node: Text, from: number, to: number) => { const r = document.createRange(); r.setStart(node, from); r.setEnd(node, to); return Math.round(r.getBoundingClientRect().top); };
    return { height: el.getBoundingClientRect().height, before: top(a, a.length - 1, a.length), dot: Math.round(el.querySelector(".joined-sep")!.getBoundingClientRect().top), after: top(b, 0, 1) };
  });
  expect(layout.height).toBeGreaterThan(30);
  expect([layout.before, layout.after]).toEqual([layout.dot, layout.dot]);
  // a value of a row (whole) never flows
  await at(page, 60);
  expect(await form(page, "whole")).toBe("stacked");
});

test("jedna část je jen text, bez obalu", async ({ page }) => {
  await at(page, 400);
  expect(await page.locator("#one .joined").count()).toBe(0);
  expect(await lines(page, "one")).toEqual(["Bez ohřevu"]);
});

test("víc částí: zalomí se jen v místě tečky, tečky uvnitř řádku zůstanou", async ({ page }) => {
  await at(page, 400);
  expect(await lines(page, "three")).toEqual(["12:00 · 3,2 kW · nabíjí"]);
  await at(page, 120);
  expect(await lines(page, "three")).toEqual(["12:00 · 3,2 kW", "nabíjí"]);
  // the text for copying and for the screen reader has no dot at the break
  expect(await page.locator("#three").evaluate((el: HTMLElement) => el.innerText.replace(/\s+/g, " ").trim())).toBe("12:00 · 3,2 kW nabíjí");
});
