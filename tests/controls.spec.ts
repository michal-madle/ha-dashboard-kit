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
  const defined = await page.evaluate(() => ["kit-switch", "kit-segmented", "kit-slider", "kit-ring", "kit-tile", "kit-sheet"].map((name) => !!customElements.get(name)));
  expect(defined).toEqual([true, true, true, true, true, true]);
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

test.describe("kolečko", () => {
  test("je obrázek s názvem, číslo uprostřed a jednotka pod ním; výplň je z tokenu", async ({ page }) => {
    const ring = page.locator("#ring");
    await expect(ring.getByRole("img", { name: "Half done" })).toBeVisible();
    await expect(ring.locator(".num")).toHaveText("50");
    await expect(ring.locator(".unit")).toHaveText("W");
    const box = await ring.locator(".ring").boundingBox();
    expect([box?.width, box?.height]).toEqual([40, 40]);
    const num = await ring.locator(".num").boundingBox();
    const unit = await ring.locator(".unit").boundingBox();
    // The number is centred horizontally and the unit stands under it.
    expect(Math.abs(num!.x + num!.width / 2 - (box!.x + box!.width / 2))).toBeLessThan(1);
    expect(unit!.y).toBeGreaterThan(num!.y);
    expect(await ring.locator(".fill").evaluate((fill) => getComputedStyle(fill).stroke)).toBe("rgb(48, 209, 88)");
  });

  test("procento nemá jednotku: číslo je uprostřed kolečka vodorovně i svisle", async ({ page }) => {
    const ring = page.locator("#alone");
    await expect(ring.locator(".unit")).toHaveCount(0);
    const box = await ring.locator(".ring").boundingBox();
    const num = await ring.locator(".num").boundingBox();
    expect(Math.abs(num!.x + num!.width / 2 - (box!.x + box!.width / 2))).toBeLessThan(1);
    expect(Math.abs(num!.y + num!.height / 2 - (box!.y + box!.height / 2))).toBeLessThan(1.5);
  });

  test("výplň je poměr obvodu a poměr se ořízne na 0 až 1; bez čísla je jen kruh", async ({ page }) => {
    const dash = (selector: string) =>
      page.locator(selector).locator(".fill").evaluate((fill: Element) => {
        const [filled, whole] = (fill.getAttribute("stroke-dasharray") ?? "").split(" ").map(Number);
        return Math.round((filled / whole) * 1000) / 1000;
      });
    expect(await dash("#ring")).toBe(0.5);
    expect(await dash("#bare")).toBe(1);
    await expect(page.locator("#bare .num")).toHaveCount(0);
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe("dlaždice (CURRENT_SPEC.md, Ovládací prvky, Dlaždice)", () => {
  const tile = (page: Page, id: string) => page.locator(`#${id}`);

  test("chráněná dlaždice: jedno klepnutí jen ukáže nápovědu nad dlaždicí uvnitř stránky a nic nehne", async ({ page }) => {
    const grid = await page.locator("#tiles").boundingBox();
    const box = await tile(page, "t-fan").boundingBox();
    await tile(page, "t-fan").click();
    const hint = tile(page, "t-fan").locator(".hint");
    await expect(hint).toHaveText("Hold or tap twice.");
    expect(await events(page)).toEqual([]);
    const bubble = (await hint.boundingBox())!;
    expect(bubble.y + bubble.height).toBeLessThanOrEqual(box!.y + 1);
    expect(bubble.x).toBeGreaterThanOrEqual(0);
    expect(await tile(page, "t-fan").boundingBox()).toEqual(box);
    expect(await page.locator("#tiles").boundingBox()).toEqual(grid);
  });

  test("chráněná dlaždice přepne dvojklepem, podržením právě jednou a klávesnicí hned; zapnutá žádá vypnutí", async ({ page }) => {
    await tile(page, "t-fan").dblclick();
    expect(await events(page)).toEqual([{ type: "hdk-toggle", id: "t-fan", detail: { checked: true } }]);
    const box = (await tile(page, "t-on").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    expect((await events(page)).slice(1)).toEqual([{ type: "hdk-toggle", id: "t-on", detail: { checked: false } }]);
    await tile(page, "t-fan").locator("button").focus();
    await page.keyboard.press("Space");
    expect((await events(page)).length).toBe(3);
  });

  test("dlaždice s popupem se otevře jedním klepnutím i s guarded, má šipku a aria-haspopup", async ({ page }) => {
    await tile(page, "t-open").click();
    expect(await events(page)).toEqual([{ type: "hdk-open", id: "t-open", detail: {} }]);
    await expect(tile(page, "t-open").locator(".chevron")).toHaveText("›");
    await expect(tile(page, "t-open").locator("button")).toHaveAttribute("aria-haspopup", "dialog");
    await expect(tile(page, "t-fan").locator(".chevron")).toHaveCount(0);
  });

  test("předvolba: akce s počtem, chráněná jen dvojklepem; nechráněná hned; vypnutá nic", async ({ page }) => {
    await expect(tile(page, "t-preset").locator(".count")).toHaveText("3");
    await tile(page, "t-preset").click();
    expect(await events(page)).toEqual([]);
    await page.waitForTimeout(500);
    await tile(page, "t-preset").dblclick();
    await tile(page, "t-free").click();
    await tile(page, "t-dis").click({ force: true });
    expect(await events(page)).toEqual([{ type: "hdk-press", id: "t-preset", detail: {} }, { type: "hdk-press", id: "t-free", detail: {} }]);
  });

  test("stavy vypadají různě (obrys, výplň, zapnuto, smíšeno), dlaždice má aspoň 44 px a axe nic nehlásí", async ({ page }) => {
    const look = (id: string) => tile(page, id).locator("button").evaluate((button) => {
      const style = getComputedStyle(button);
      return { bg: style.backgroundColor, shadow: style.boxShadow, h: button.getBoundingClientRect().height, w: button.getBoundingClientRect().width };
    });
    const [off, on, idle, mixed] = [await look("t-fan"), await look("t-on"), await look("t-open"), await look("t-preset")];
    expect(off.bg).toBe("rgba(0, 0, 0, 0)");
    expect(off.shadow).not.toBe("none");
    expect(new Set([off.bg, on.bg, idle.bg, mixed.bg]).size).toBe(4);
    for (const item of [off, on, idle, mixed]) {
      expect(item.h).toBeGreaterThanOrEqual(44);
      expect(item.w).toBeGreaterThanOrEqual(44);
    }
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe("list odspodu (CURRENT_SPEC.md, Ovládací prvky, List odspodu)", () => {
  const open = async (page: Page) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.locator("#open-sheet").click();
    await expect(page.getByRole("dialog", { name: "Žaluzie" })).toBeVisible();
  };
  const closes = async (page: Page) => (await events(page)).filter((event) => event.type === "hdk-close").length;

  test("otevře se odspodu s nadpisem a druhým řádkem, fokus je v listu, stránka pod ním se nehne", async ({ page }) => {
    const before = await page.locator("#tiles").boundingBox();
    await open(page);
    const bottom = async () => {
      const box = (await page.locator("#sheet").getByRole("dialog").boundingBox())!;
      return Math.round(box.y + box.height);
    };
    await expect.poll(bottom).toBe(852);
    await expect(page.locator("#sheet").getByText("4 místnosti")).toBeVisible();
    expect(await page.locator("#tiles").boundingBox()).toEqual(before);
    expect(await page.evaluate(() => document.querySelector("#sheet")!.shadowRoot!.activeElement?.getAttribute("role"))).toBe("dialog");
  });

  test("zavře ho ✕, klepnutí vedle, Escape i stažení dolů; klepnutí do listu ne; fokus se vrátí", async ({ page }) => {
    await open(page);
    await page.locator("#in-a").click();
    expect(await closes(page)).toBe(0);
    await page.getByRole("button", { name: "Zavřít" }).click();
    expect(await closes(page)).toBe(1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("open-sheet");
    await open(page);
    await page.mouse.click(200, 40);
    expect(await closes(page)).toBe(2);
    await open(page);
    await page.keyboard.press("Escape");
    expect(await closes(page)).toBe(3);
    await open(page);
    const grabber = (await page.locator("#sheet .grabber").boundingBox())!;
    await page.mouse.move(grabber.x + 18, grabber.y + 2);
    await page.mouse.down();
    await page.mouse.move(grabber.x + 18, grabber.y + 60, { steps: 4 });
    await page.mouse.move(grabber.x + 18, grabber.y + 160, { steps: 4 });
    await page.mouse.up();
    expect(await closes(page)).toBe(4);
  });

  test("Tab zůstává v listu: ✕, obsah a zpět na ✕", async ({ page }) => {
    await open(page);
    const focused = () => page.evaluate(() => {
      let active: Element | null = document.activeElement;
      const ids: string[] = [];
      while (active) {
        ids.push(active.id || active.className || active.localName);
        active = active.shadowRoot?.activeElement ?? null;
      }
      return ids.join(">");
    });
    await page.keyboard.press("Tab");
    expect(await focused()).toContain("close");
    await page.keyboard.press("Tab");
    expect(await focused()).toBe("in-a");
    await page.keyboard.press("Tab");
    expect(await focused()).toContain("in-tile");
    await page.keyboard.press("Tab");
    expect(await focused()).toContain("close");
  });

  test("axe bez porušení s otevřeným listem", async ({ page }) => {
    await open(page);
    expect(await axeViolations(page, ["page-has-heading-one", "region"])).toEqual([]);
  });
});
