import { css, html, nothing } from "lit";
import type { TemplateResult } from "lit";

/*
 * Text from parts joined by a dot (CURRENT_SPEC.md, Text z částí; uživatel 12. 11. 2026: „když je na 2 řádky,
 * není tam · oddělovač ale oddělovačem je nový řádek“, „Q126 A“ = in both cards):
 * - one line with the dots when it fits: „Přetoky 60 · Boost 55 °C“;
 * - else one part per line without the dot: „Přetoky 60 °C“ / „Boost 55 °C“;
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
    (part, i) => html`${i ? html`<span class="joined-sep"> · </span>` : nothing}<span class="joined-part">${part}</span>`,
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
    el.classList.remove("stacked", "flow");
    const parts = el.querySelectorAll<HTMLElement>(":scope > .joined-part");
    const first = parts[0]?.getBoundingClientRect();
    const last = parts[parts.length - 1]?.getBoundingClientRect();
    if (!first || !last || !first.width) {
      delete el.dataset.fit;
      return;
    }
    el.dataset.fit = fit;
    if (last.top <= first.top + 1) return;
    el.classList.add("stacked");
    // A part longer than its own line would leave an orphan line: one flowing text instead.
    if (!el.classList.contains("whole") && [...parts].some((part) => part.scrollWidth > part.clientWidth + 0.5)) {
      el.classList.replace("stacked", "flow");
    }
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

  .joined-only,
  .joined.stacked .joined-sep {
    display: none;
  }

  .joined.stacked,
  .joined.stacked .joined-part {
    display: block;
  }

  .joined.stacked .joined-only {
    display: inline;
  }

  .joined.flow .joined-part {
    white-space: normal;
  }

  .joined.flow .joined-sep {
    white-space: nowrap;
  }
`;
