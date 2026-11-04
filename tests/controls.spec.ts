import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { axeViolations } from "../testing/helpers.mjs";

// CURRENT_SPEC.md, Ovládací prvky a Chráněné ovládání.

const events = (page: Page) => page.evaluate(() => (window as any).events as Array<{ type: string; id: string; detail: any }>);

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/harness.html");
  await page.waitForFunction(() => (window as any).ready === true);
});

test("registrace je idempotentní: dvojí defineControls nespadne a prvky jsou definované", async ({ page }) => {
  const defined = await page.evaluate(() => ["kit-switch", "kit-segmented", "kit-slider"].map((name) => !!customElements.get(name)));
  expect(defined).toEqual([true, true, true]);
});

test("nechráněný přepínač přepne jedním klepnutím", async ({ page }) => {
  await page.locator("#plain").click();
  expect(await events(page)).toEqual([{ type: "hdk-toggle", id: "plain", detail: { checked: true } }]);
});

test.describe("chráněný přepínač", () => {
  const sw = (page: Page) => page.locator("#guarded");

  test("jedno klepnutí nepřepne, ukáže nápovědu nad přepínačem a nic nehne", async ({ page }) => {
    const before = await page.locator("main").boundingBox();
    const box = await sw(page).boundingBox();
    await sw(page).click();
    await expect(sw(page).locator(".hint")).toHaveText("Hold or tap twice.");
    expect(await events(page)).toEqual([]);
    const hint = await sw(page).locator(".hint").boundingBox();
    expect(hint!.y + hint!.height).toBeLessThanOrEqual(box!.y + 1);
    expect(await sw(page).boundingBox()).toEqual(box);
    expect(await page.locator("main").boundingBox()).toEqual(before);
  });

  test("dvojklep přepne", async ({ page }) => {
    await sw(page).dblclick();
    expect(await events(page)).toEqual([{ type: "hdk-toggle", id: "guarded", detail: { checked: true } }]);
  });

  test("podržení přepne právě jednou a následné uvolnění nepřepne znovu", async ({ page }) => {
    const box = (await sw(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    expect((await events(page)).length).toBe(1);
  });

  test("klávesnice přepne hned", async ({ page }) => {
    await sw(page).locator("button").focus();
    await page.keyboard.press("Space");
    expect((await events(page)).map((event) => event.detail)).toEqual([{ checked: true }]);
  });

  test("nápověda sama zmizí po hintSeconds", async ({ page }) => {
    await page.evaluate(() => ((document.getElementById("guarded") as any).hintSeconds = 1));
    await sw(page).click();
    await expect(sw(page).locator(".hint")).toHaveCount(1);
    await expect(sw(page).locator(".hint")).toHaveCount(0, { timeout: 2500 });
  });
});

test.describe("chráněný segmentový ovladač", () => {
  const seg = (page: Page) => page.locator("#seg");
  const boost = (page: Page) => seg(page).getByRole("radio", { name: "Boost" });

  test("jedno klepnutí na jinou volbu jen ukáže nápovědu; nic se nehne", async ({ page }) => {
    const box = await seg(page).boundingBox();
    await boost(page).click();
    await expect(seg(page).locator(".hint")).toHaveText("Hold, drag or tap twice.");
    expect(await events(page)).toEqual([]);
    expect(await seg(page).boundingBox()).toEqual(box);
  });

  test("dvojklep přepne", async ({ page }) => {
    await boost(page).dblclick();
    expect(await events(page)).toEqual([{ type: "hdk-select", id: "seg", detail: { value: "b" } }]);
  });

  test("podržení jiné volby přepne", async ({ page }) => {
    const box = (await boost(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    expect((await events(page)).map((event) => event.detail)).toEqual([{ value: "b" }]);
  });

  test("tažení palce na jinou volbu přepne", async ({ page }) => {
    const track = (await seg(page).locator(".track").boundingBox())!;
    const y = track.y + track.height / 2;
    await page.mouse.move(track.x + track.width * 0.25, y);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width * 0.6, y, { steps: 6 });
    await page.mouse.move(track.x + track.width * 0.8, y, { steps: 6 });
    await page.mouse.up();
    expect((await events(page)).map((event) => event.detail)).toEqual([{ value: "b" }]);
  });

  test("šipka přepne hned", async ({ page }) => {
    await seg(page).getByRole("radio", { name: "Surplus" }).focus();
    await page.keyboard.press("ArrowRight");
    expect((await events(page)).map((event) => event.detail)).toEqual([{ value: "b" }]);
  });

  test("nechráněný se přepne jedním klepnutím", async ({ page }) => {
    await page.locator("#free").getByRole("radio", { name: "Boost" }).click();
    expect((await events(page)).map((event) => event.detail)).toEqual([{ value: "b" }]);
  });
});

test("posuvník: klávesnice změní hodnotu a pošle hdk-change; čtečka má název a hodnotu", async ({ page }) => {
  const input = page.locator("#slider").locator("input[type=range]");
  await expect(input).toHaveAttribute("aria-label", "Temperature");
  await input.focus();
  await page.keyboard.press("ArrowRight");
  const changes = (await events(page)).filter((event) => event.type === "hdk-change");
  expect(changes.map((event) => event.detail)).toEqual([{ value: 51 }]);
});

test("přístupnost: axe bez porušení", async ({ page }) => {
  expect(await axeViolations(page)).toEqual([]);
});
