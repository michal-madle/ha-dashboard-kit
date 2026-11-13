import { describe, expect, it, vi } from "vitest";
import { RunStarts, lastRun } from "../../src/runstart";
import type { HomeAssistant } from "../../src/types";

// CURRENT_SPEC.md, Entity a data: doba stavu přežije restart Home Assistantu.
const t = (hour: number, minute = 0) => Date.UTC(2026, 10, 13, hour, minute);

describe("lastRun: začátek posledního běhu stejného stavu", () => {
  it("restart (stejný stav znovu zapsaný) běh nepřerušuje", () => {
    const rows = [
      { s: "off", lu: t(8) / 1000 },
      { s: "on", lu: t(9) / 1000 },
      { s: "on", lu: t(9, 30) / 1000 },
    ];
    expect(lastRun(rows)).toEqual({ state: "on", start: t(9) });
  });

  it("mezera unavailable / unknown není změna, jen jiný známý stav začíná nový běh", () => {
    expect(lastRun([{ s: "on", lu: t(9) / 1000 }, { s: "unavailable", lu: t(9, 20) / 1000 }, { s: "on", lu: t(9, 25) / 1000 }])).toEqual({ state: "on", start: t(9) });
    expect(lastRun([{ s: "on", lu: t(9) / 1000 }, { s: "unknown", lu: t(9, 20) / 1000 }, { s: "off", lu: t(9, 25) / 1000 }, { s: "on", lu: t(9, 40) / 1000 }])).toEqual({ state: "on", start: t(9, 40) });
  });

  it("řádky bez stavu nebo času se přeskočí, čas může být ISO text i milisekundy, plná podoba má `state` a `last_updated`", () => {
    expect(lastRun([{ lu: t(9) / 1000 }, { s: "on" }, { state: "on", last_updated: new Date(t(9, 5)).toISOString() }, { s: "on", lu: t(9, 6) }])).toEqual({ state: "on", start: t(9, 5) });
  });

  it("bez řádků nebo jen s mezerou není nic známo", () => {
    expect(lastRun(undefined)).toBeUndefined();
    expect(lastRun([])).toBeUndefined();
    expect(lastRun([{ s: "unavailable", lu: t(9) / 1000 }])).toBeUndefined();
  });
});

function fakeHass(states: Record<string, { state: string; last_changed?: string }>, history: Record<string, unknown[]> | Error) {
  const callWS = vi.fn(async () => {
    if (history instanceof Error) throw history;
    return history;
  });
  return { hass: { states: Object.fromEntries(Object.entries(states).map(([id, value]) => [id, { attributes: {}, ...value }])), callWS } as unknown as HomeAssistant, callWS };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("RunStarts: doba od skutečného začátku", () => {
  const restart = new Date(t(10, 28)).toISOString();

  it("hned vrátí last_changed, po odpovědi recorderu začátek před restartem a požádá o překreslení", async () => {
    const { hass, callWS } = fakeHass({ "input_boolean.pracka": { state: "on", last_changed: restart } }, { "input_boolean.pracka": [{ s: "off", lu: t(8) / 1000 }, { s: "on", lu: t(10) / 1000 }, { s: "on", lu: t(10, 28) / 1000 }] });
    const changed = vi.fn();
    const starts = new RunStarts(changed, () => t(10, 30));
    expect(starts.of(hass, "input_boolean.pracka")).toBe(t(10, 28));
    await tick();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(starts.of(hass, "input_boolean.pracka")).toBe(t(10));
    // Podruhé už se neptá.
    expect(starts.of(hass, "input_boolean.pracka")).toBe(t(10));
    await tick();
    expect(callWS).toHaveBeenCalledTimes(1);
  });

  it("překreslení během dotazu se neptá znovu (dříve nekonečná smyčka dotazů)", async () => {
    const { hass, callWS } = fakeHass({ "input_boolean.pracka": { state: "on", last_changed: restart } }, { "input_boolean.pracka": [{ s: "on", lu: t(10) / 1000 }] });
    let starts: RunStarts;
    // Karta se překreslí při každé odpovědi i mezi tím, než odpověď přijde.
    const render = () => starts.of(hass, "input_boolean.pracka");
    starts = new RunStarts(render, () => t(10, 30));
    render();
    await Promise.resolve();
    render();
    for (let i = 0; i < 5; i++) await tick();
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(render()).toBe(t(10));
  });

  it("jeden dotaz na všechny entity jednoho vykreslení, okno je posledních 7 dní", async () => {
    const { hass, callWS } = fakeHass(
      { "a.x": { state: "on", last_changed: restart }, "b.y": { state: "open", last_changed: restart } },
      { "a.x": [{ s: "on", lu: t(10) / 1000 }], "b.y": [{ s: "closed", lu: t(7) / 1000 }, { s: "open", lu: t(9) / 1000 }] },
    );
    const starts = new RunStarts(() => undefined, () => t(10, 30));
    starts.of(hass, "a.x");
    starts.of(hass, "b.y");
    await tick();
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(callWS).toHaveBeenCalledWith({
      type: "history/history_during_period",
      start_time: new Date(t(10, 30) - 7 * 24 * 3_600_000).toISOString(),
      end_time: new Date(t(10, 30)).toISOString(),
      entity_ids: ["a.x", "b.y"],
      include_start_time_state: true,
      significant_changes_only: false,
      minimal_response: true,
      no_attributes: true,
    });
    expect(starts.of(hass, "a.x")).toBe(t(10));
    expect(starts.of(hass, "b.y")).toBe(t(9));
  });

  it("nová změna stavu (jiný last_changed) se zeptá znovu; start z historie nikdy není pozdější než last_changed", async () => {
    const first = fakeHass({ "a.x": { state: "on", last_changed: new Date(t(10)).toISOString() } }, { "a.x": [{ s: "on", lu: t(10, 5) / 1000 }] });
    const starts = new RunStarts(() => undefined, () => t(11));
    starts.of(first.hass, "a.x");
    await tick();
    expect(starts.of(first.hass, "a.x")).toBe(t(10));
    const second = fakeHass({ "a.x": { state: "on", last_changed: new Date(t(10, 40)).toISOString() } }, { "a.x": [{ s: "off", lu: t(9) / 1000 }, { s: "on", lu: t(10, 40) / 1000 }] });
    starts.of(second.hass, "a.x");
    await tick();
    expect(second.callWS).toHaveBeenCalledTimes(1);
    expect(starts.of(second.hass, "a.x")).toBe(t(10, 40));
  });

  it("chyba dotazu, prázdná historie nebo jiný poslední stav: platí last_changed a nezkouší se dokola", async () => {
    for (const history of [new Error("offline"), {} as Record<string, unknown[]>, { "a.x": [{ s: "off", lu: t(9) / 1000 }] }]) {
      const { hass, callWS } = fakeHass({ "a.x": { state: "on", last_changed: restart } }, history);
      const starts = new RunStarts(() => undefined, () => t(11));
      starts.of(hass, "a.x");
      await tick();
      expect(starts.of(hass, "a.x")).toBe(t(10, 28));
      await tick();
      expect(callWS).toHaveBeenCalledTimes(1);
    }
  });

  it("chybějící entita nebo čas: undefined", () => {
    const { hass } = fakeHass({ "a.x": { state: "on" } }, {});
    const starts = new RunStarts(() => undefined);
    expect(starts.of(hass, "a.nic")).toBeUndefined();
    expect(starts.of(undefined, "a.x")).toBeUndefined();
    expect(starts.of(hass, undefined)).toBeUndefined();
    expect(starts.of(hass, "a.x")).toBeUndefined();
  });
});
