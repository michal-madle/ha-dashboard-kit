import { css, unsafeCSS } from "lit";
import type { CSSResult } from "lit";
import type { HomeAssistant } from "./types";

/*
 * Colours of every card (CURRENT_SPEC.md kitu, Barvy; DASHBOARD_UX_SYSTEM.md, Povrchy, Text, Barvy; uživatel 21. 11. 2026:
 * „Q371 A“, „Sjednoť vše co můžeš. At je to všechno stejné“). The kit gives the shared surfaces, texts and the colours
 * of its controls for the dark and the light mode; a card adds only what is its own (colours of meaning, sources,
 * rooms) and may change the accent. The light set is on `:host([data-light])`, which `Appearance` sets.
 *
 * The light rule has the specificity of `:host` (`:where`), so a card's own `:host { --hdk-… }` after it wins in both
 * modes. Tokens derived from others (`--hdk-tile: var(--hdk-card)`) follow the mode by themselves.
 */

const DARK = `
  --hdk-page: #000000;
  --hdk-card: #1c1c1e;
  --hdk-el: #2c2c2e;
  --hdk-sep: rgb(84 84 88 / 65%);
  --hdk-text: #ffffff;
  --hdk-secondary: #98989f;
  --hdk-nodata: #8e8e93;
  --hdk-blue: #0a84ff;
  --hdk-primary: #0a6ed1;
  --hdk-button: rgb(118 118 128 / 24%);
  --hdk-pop-shadow: rgb(0 0 0 / 55%);
  --hdk-accent: var(--hdk-blue);
  --hdk-switch-off: rgb(120 120 128 / 36%);
  --hdk-track: var(--hdk-el);
  --hdk-track-compact: #3a3a3c;
  --hdk-bar: rgb(255 255 255 / 14%);
  --hdk-tick: rgb(255 255 255 / 28%);
  --hdk-seg-thumb: #636366;
  --hdk-seg-text: #ebebf5;
  --hdk-seg-selected: #ffffff;
  --hdk-bubble: #3a3a3c;
  --hdk-bubble-text: #ffffff;
  --hdk-tile: var(--hdk-card);
  --hdk-tile-text: var(--hdk-text);
  --hdk-tile-border: var(--hdk-sep);
  --hdk-tile-on: var(--hdk-primary);
  --hdk-tile-on-text: #ffffff;
  --hdk-tile-on-sub: #ffffff;
  --hdk-tile-on-border: transparent;
  --hdk-tile-mixed: #17395d;
  --hdk-tile-badge: rgb(255 255 255 / 16%);
  --hdk-sheet-bg: var(--hdk-card);
  --hdk-sheet-text: var(--hdk-text);
  --hdk-sheet-border: rgb(255 255 255 / 10%);
  --hdk-sheet-grabber: rgb(255 255 255 / 28%);
  --hdk-sheet-backdrop: 60%;
  --hdk-sheet-button: var(--hdk-button);
  --hdk-ring-track: rgb(118 118 128 / 24%);
  --hdk-ring-text: var(--hdk-text);
  --hdk-ring-sub: var(--hdk-secondary);
`;

const LIGHT = `
  --hdk-page: #f2f2f7;
  --hdk-card: #ffffff;
  --hdk-el: #f2f2f7;
  --hdk-sep: rgb(60 60 67 / 29%);
  --hdk-text: #000000;
  --hdk-secondary: #5f5f66;
  --hdk-nodata: #6e6e73;
  --hdk-blue: #0a6ed1;
  --hdk-button: rgb(118 118 128 / 12%);
  --hdk-pop-shadow: rgb(0 0 0 / 22%);
  --hdk-switch-off: rgb(120 120 128 / 32%);
  --hdk-track-compact: #e5e5ea;
  --hdk-bar: rgb(60 60 67 / 18%);
  --hdk-tick: rgb(60 60 67 / 30%);
  --hdk-seg-thumb: #ffffff;
  --hdk-seg-text: #000000;
  --hdk-seg-selected: #000000;
  --hdk-bubble: #1c1c1e;
  --hdk-tile-on: #d8e8f8;
  --hdk-tile-on-text: #000000;
  --hdk-tile-on-sub: #0a5cb0;
  --hdk-tile-on-border: #0a6ed1;
  --hdk-tile-mixed: #e6eff9;
  --hdk-tile-badge: rgb(60 60 67 / 14%);
  --hdk-sheet-border: rgb(0 0 0 / 8%);
  --hdk-sheet-grabber: rgb(60 60 67 / 30%);
  --hdk-sheet-backdrop: 35%;
`;

/**
 * The shared colours for the card's shadow root (first in its `styles`). `prefix` is the card's: tiles in a sheet from
 * the bottom and in the popup Topení / Klimatizace lie on the sheet, so they have the colour of an element in a group
 * (`--hdk-el`), and the popup keeps the system blue (in both cards the same, DASHBOARD_UX_SYSTEM.md).
 */
export function paletteStyles(prefix: string): CSSResult {
  const sheet = unsafeCSS(`${prefix}-sheet`);
  const climate = unsafeCSS(`${prefix}-climate`);
  return css`
    :host {
      ${unsafeCSS(DARK)}
    }
    :host(:where([data-light])) {
      ${unsafeCSS(LIGHT)}
    }
    ${sheet},
    ${climate} {
      --hdk-tile: var(--hdk-el);
    }
    ${climate} {
      --hdk-accent: var(--hdk-blue);
    }
  `;
}

/**
 * Dark or light (DASHBOARD_UX_SYSTEM.md, Povrchy: „jen přepíná tmavý/světlý podle Home Assistantu; vlastní nastavení
 * vzhledu karta nemá“): the dark mode Home Assistant uses (`hass.themes.darkMode`), and without it the colour scheme of
 * the system. `apply` sets `data-light` on the card, which switches `paletteStyles` and the card's own light colours.
 */
export class Appearance {
  private query?: MediaQueryList;
  private prefersDark = true;

  constructor(
    private readonly host: HTMLElement,
    private readonly changed: () => void = () => undefined,
  ) {}

  connect(): void {
    this.query = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined;
    this.prefersDark = this.query?.matches ?? true;
    this.query?.addEventListener?.("change", this.onChange);
  }

  disconnect(): void {
    this.query?.removeEventListener?.("change", this.onChange);
    this.query = undefined;
  }

  /** True in the light mode. */
  light(hass: HomeAssistant | undefined): boolean {
    const dark = hass?.themes?.darkMode;
    return !(typeof dark === "boolean" ? dark : this.prefersDark);
  }

  /** Sets `data-light` on the card; returns the light mode. */
  apply(hass: HomeAssistant | undefined): boolean {
    const light = this.light(hass);
    this.host.toggleAttribute("data-light", light);
    return light;
  }

  private readonly onChange = (event: MediaQueryListEvent): void => {
    this.prefersDark = event.matches;
    this.changed();
  };
}
