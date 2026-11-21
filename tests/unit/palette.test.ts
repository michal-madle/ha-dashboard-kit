import { describe, expect, it, vi } from "vitest";
import { Appearance, paletteStyles } from "../../src/palette";
import type { HomeAssistant } from "../../src/types";

// CURRENT_SPEC.md kitu, Barvy.

const hass = (darkMode: boolean | undefined) => ({ states: {}, themes: darkMode === undefined ? {} : { darkMode } }) as unknown as HomeAssistant;
const host = () => {
  const attributes = new Set<string>();
  return { attributes, toggleAttribute: (name: string, on: boolean) => (on ? attributes.add(name) : attributes.delete(name)) } as unknown as HTMLElement & { attributes: Set<string> };
};

describe("tmavý a světlý režim", () => {
  it("podle Home Assistantu; bez něj podle systému; data-light na kartě", () => {
    const listeners: Array<(event: { matches: boolean }) => void> = [];
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.push(fn), removeEventListener: vi.fn() }) });
    const card = host();
    const changed = vi.fn();
    const appearance = new Appearance(card, changed);
    appearance.connect();
    expect(appearance.apply(hass(true))).toBe(false);
    expect(card.attributes.has("data-light")).toBe(false);
    expect(appearance.apply(hass(false))).toBe(true);
    expect(card.attributes.has("data-light")).toBe(true);
    expect(appearance.light(hass(undefined))).toBe(true);
    listeners[0]({ matches: true });
    expect(changed).toHaveBeenCalledTimes(1);
    expect(appearance.light(hass(undefined))).toBe(false);
    appearance.disconnect();
    vi.unstubAllGlobals();
  });

  it("bez matchMedia je výchozí tmavý", () => {
    vi.stubGlobal("window", {});
    const appearance = new Appearance(host());
    appearance.connect();
    expect(appearance.light(hass(undefined))).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("barvy", () => {
  it("tmavá i světlá sada, list a popup s předponou karty", () => {
    const text = paletteStyles("kd").cssText;
    expect(text).toContain("--hdk-card: #1c1c1e;");
    expect(text).toContain(":host(:where([data-light]))");
    expect(text).toContain("--hdk-card: #ffffff;");
    expect(text).toMatch(/kd-sheet,\s*kd-climate\s*\{\s*--hdk-tile: var\(--hdk-el\);/);
  });
});
