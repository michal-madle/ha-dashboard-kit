import { css, html, nothing } from "lit";
import type { TemplateResult } from "lit";

/*
 * Text from parts joined by a dot (CURRENT_SPEC.md, Text z částí; uživatel 12. 11. 2026: „když je na 2 řádky,
 * není tam · oddělovač ale oddělovačem je nový řádek“, „Q126 A“ = in both cards):
 * - one line with the dots when it fits: „Přetoky 60 · Boost 55 °C“;
 * - else the lines break only at a dot, and that dot goes: „Přetoky 60 °C“ / „Boost 55 °C“ (more parts: the dots
 *   inside a line stay, „12:00 · 3,2 kW“ / „nabíjí“);
 * - a part that does not fit even its own line: one flowing text, the dot never starts or ends a line.
 * `fitJoined` decides after drawing; the card calls it from `updated()` and when a web font arrives.
 */

export interface JoinedOptions {
  /** The parts never wrap inside (the value of a row beside its title): separate lines, never flowing text. */
  whole?: boolean;
}

/** Parts joined by a dot; fewer than two parts are drawn as they are. A `.joined-only` piece shows only on separate lines. */
export function joined(parts: readonly unknown[], options: JoinedOptions = {}): TemplateResult {
  if (parts.length < 2) return html`${parts[0] ?? nothing}`;
  return html`<span class="joined ${options.whole ? "whole" : ""}">${parts.map(
    (part, i) => html`${i ? html`<span class="joined-sep"><span class="joined-dot">\u00a0·</span> </span>` : nothing}<span class="joined-part">${part}</span>`,
  )}</span>`;
}

/** A translated text with „ · “ inside („Okno otevřené · topí se“) as its parts. */
export function joinedText(text: string, options: JoinedOptions = {}): TemplateResult {
  return joined(text.split(" · "), options);
}

/**
 * Chooses the form of every joined text under `root`. `key` changes with what moves the text (the card width, a
 * loaded font); a text is measured again only when the key or its own text changed.
 */
export function fitJoined(root: ParentNode, key: string): void {
  root.querySelectorAll<HTMLElement>(".joined").forEach((el) => {
    const fit = `${key}|${el.textContent}`;
    if (el.dataset.fit === fit) return;
    el.classList.remove("stacked", "flow", "probe");
    const seps = [...el.querySelectorAll<HTMLElement>(":scope > .joined-sep")];
    seps.forEach((sep) => sep.classList.remove("break"));
    const parts = [...el.querySelectorAll<HTMLElement>(":scope > .joined-part")];
    const tops = parts.map((part) => part.getBoundingClientRect());
    if (!tops.length || !tops[0].width) {
      delete el.dataset.fit;
      return;
    }
    el.dataset.fit = fit;
    // Where the browser started a new line, the dot in front of that part becomes the line break.
    const breaks = seps.filter((_, i) => tops[i + 1].top > tops[i].top + 1);
    if (!breaks.length) return;
    if (!el.classList.contains("whole")) {
      // A part longer than its own line would leave an orphan line: one flowing text instead.
      el.classList.add("probe");
      const long = parts.some((part) => part.scrollWidth > part.clientWidth + 0.5);
      el.classList.remove("probe");
      if (long) {
        el.classList.add("flow");
        return;
      }
    }
    el.classList.add("stacked");
    breaks.forEach((sep) => sep.classList.add("break"));
  });
}

/** Styles of `joined`; the card adds them to its own. */
export const joinedStyles = css`
  .joined {
    min-width: 0;
  }

  .joined-part {
    white-space: nowrap;
  }

  .joined-only {
    display: none;
  }

  .joined.stacked .joined-only {
    display: inline;
  }

  /* Where the line breaks the dot goes; the space stays, so a copied or read text keeps its words apart. */
  .joined.stacked .joined-sep.break .joined-dot {
    display: none;
  }

  .joined.stacked .joined-sep.break::after {
    content: "\\A";
    white-space: pre;
  }

  /* Measuring only: every part on its own line. */
  .joined.probe {
    display: block;
  }

  .joined.probe .joined-part {
    display: block;
  }

  .joined.flow .joined-part {
    white-space: normal;
  }

  .joined.flow .joined-sep {
    white-space: nowrap;
  }
`;
