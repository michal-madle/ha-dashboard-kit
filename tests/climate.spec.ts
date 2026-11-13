import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { axeViolations, joinedLines } from "../testing/helpers.mjs";

// CURRENT_SPEC.md kitu, Popup Topení / Klimatizace.

type Call = { domain?: string; service?: string; data?: Record<string, unknown>; ws?: Record<string, unknown> };
const calls = (page: Page) => page.evaluate(() => (window as any).calls as Call[]);
async function open(page: Page, query = "") {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto(`/tests/climate.html?${query}`);
  await page.waitForFunction(() => (window as any).ready === true);
  await page.locator("kit-climate kit-tile").first().waitFor();
}
const room = (page: Page, name: string) => page.locator(".rooms kit-tile").filter({ hasText: name }).first();
const big = (page: Page) => page.locator("kit-climate .big");

test("klimatizace: dlaždice místností se stavem slovem, vybraná jen barvou a aria-pressed, vypnutá nevybraná je obrys", async ({ page }) => {
  await open(page);
  const tiles = await page.locator(".rooms kit-tile").evaluateAll((items) => items.map((item: any) => [item.name, item.text, item.state, item.pressed]));
  expect(tiles).toEqual([
    ["Obývák", "Chlazení · 22°", "on", true],
    ["Ložnice", "WindFree · 24°", "idle", false],
    ["Maxík", "Vypnuto", "off", false],
    ["Mikuláš", "Vypnuto", "off", false],
  ]);
  await expect(big(page)).toHaveText("22°");
  await expect(page.locator("kit-climate .sub")).toHaveText("Teď 23,4 °C");
});

test("klepnutí na zapnutou vybere všechny zapnuté, na vypnutou všechny vypnuté; různé cíle jako rozsah bez jezdce", async ({ page }) => {
  await open(page);
  await room(page, "Ložnice").click();
  expect(await page.evaluate(() => (window as any).climate.selected)).toEqual(["climate.a", "climate.b"]);
  await expect(big(page)).toHaveText("22–24°");
  await expect(page.locator("kit-climate .sub")).toHaveText("Cíl: Obývák 22° · Ložnice 24°");
  expect(await page.locator("kit-slider").evaluate((slider: any) => [slider.mixed, slider.marks])).toEqual([true, [22, 24]]);
  const notes = page.locator("kit-climate .note");
  // Text z částí: zalomí se jen v místě tečky.
  expect((await joinedLines(notes.first())).join(" · ")).toBe("Různé režimy: Obývák Chlazení · Ložnice WindFree");
  await expect(notes.nth(1)).toHaveText("První změna nastaví všechny vybrané stejně.");
  await room(page, "Maxík").click();
  expect(await page.evaluate(() => (window as any).climate.selected)).toEqual(["climate.c", "climate.d"]);
  expect(await calls(page)).toEqual([]);
});

test("změna se pošle 2 s (tady 0,3 s) po poslední změně, mezitím jen malá ikona; teplota po celých stupních", async ({ page }) => {
  await open(page, "selected=climate.a,climate.b");
  await page.locator("kit-slider input").fill("25");
  await page.locator("kit-slider input").dispatchEvent("change");
  await expect(page.locator("kit-climate .busy")).toBeVisible();
  await expect(big(page)).toHaveText("25°");
  expect(await calls(page)).toEqual([]);
  await expect.poll(() => calls(page)).toEqual([
    { domain: "climate", service: "set_temperature", data: { entity_id: "climate.a", temperature: 25 } },
    { domain: "climate", service: "set_temperature", data: { entity_id: "climate.b", temperature: 25 } },
  ]);
  await expect(page.locator("kit-climate .busy")).toHaveCount(0);
});

test("režim WindFree jedním klepnutím; Vypnout za 3 h naplánuje vypnutí; zavření (flush) pošle hned", async ({ page }) => {
  await open(page, "delay=60000");
  const modes = page.locator(".modes kit-tile");
  await expect(modes).toHaveText(["Vypnuto", "Chlazení", "WindFree", "Topení", "Větrání", "Sušení", "Auto", "Spánek"]);
  await modes.filter({ hasText: "WindFree" }).click();
  await page.locator("kit-segmented").getByRole("radio", { name: "3 h" }).click();
  await expect(page.locator("kit-climate .footer")).toContainText("Běží do");
  expect(await calls(page)).toEqual([]);
  await page.evaluate(() => (window as any).climate.flush());
  const sent = await calls(page);
  expect(sent.slice(0, 2).map((call) => call.data)).toEqual([
    { entity_id: "climate.a", hvac_mode: "cool" },
    { entity_id: "climate.a", preset_mode: "wind_free" },
  ]);
  expect((sent[2].ws as any).sequence[1]).toEqual({ condition: "state", entity_id: "climate.a", state: "cool" });
});

test("topení: půl stupně, posunutí teploty z Plánu je Ručně do změny plánu; Boost je 25° na 1 h", async ({ page }) => {
  await open(page, "system=heating&delay=60000");
  await expect(big(page)).toHaveText("21°");
  await page.locator("kit-slider input").fill("22.5");
  await page.locator("kit-slider input").dispatchEvent("change");
  await expect(big(page)).toHaveText("22,5°");
  await expect(page.locator("kit-segmented").first().locator('[aria-checked="true"]')).toHaveText("Ručně");
  await expect(page.locator("kit-climate .footer")).toHaveText("Do další změny plánu, potom zpět na plán.");
  await page.evaluate(() => (window as any).climate.flush());
  expect(await calls(page)).toEqual([{ domain: "tado_ce", service: "set_climate_timer", data: { entity_id: "climate.a", temperature: 22.5, overlay: "next_time_block" } }]);
  await page.locator("kit-segmented").first().getByRole("radio", { name: "Boost" }).click();
  await page.evaluate(() => (window as any).climate.flush());
  expect((await calls(page))[1].data).toEqual({ entity_id: "climate.a", temperature: 25, time_period: "01:00:00" });
});

test("bez akce Tado CE není „Ručně platí“ ani Boost; neaktivní segment má ztlumený jezdec; dvě běžící klimatizace v různých režimech mají Vypnout za", async ({ page }) => {
  await open(page, "system=heating&notimer=1");
  await expect(page.locator("kit-climate h3")).toHaveText(["Režim"]);
  await expect(page.locator("kit-segmented").getByRole("radio")).toHaveText(["Plán", "Ručně", "Vypnuto"]);
  await open(page, "system=heating");
  const thumb = page.locator("kit-segmented").nth(1).locator(".thumb");
  expect(await thumb.evaluate((el) => getComputedStyle(el).opacity)).toBe("0.5");
  await open(page, "selected=climate.a,climate.b");
  await expect(page.locator("kit-segmented").getByRole("radio", { name: "3 h" })).toBeEnabled();
});

test("320 px bez vodorovného posouvání a axe bez porušení (oba systémy)", async ({ page }) => {
  for (const query of ["", "system=heating"]) {
    await open(page, query);
    await page.setViewportSize({ width: 320, height: 852 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(await axeViolations(page, ["region"]), query).toEqual([]);
  }
});
