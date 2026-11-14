import { LitElement, css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { TemplateResult } from "lit";
import { HoldOrDoubleTap } from "../gesture";
import { HintState, hintStyles } from "./hint";
import { fitJoined, joinedStyles, joinedText } from "../joined";

export type TileState = "off" | "idle" | "on" | "mixed";
export type TileKind = "toggle" | "action" | "open";

/**
 * Tile of a device or of a choice (CURRENT_SPEC.md, Ovládací prvky, Dlaždice): a name and, under it, a state in words.
 *
 * `state`: `off` is only an outline, `idle` is filled (the device is on its plan, the choice is not taken), `on` has the
 * accent fill and `mixed` a weaker one (some of the devices are in this choice; `count` says how many). The state is
 * always said in words too (`text`, `count`), never by the colour alone.
 *
 * `kind`: a `toggle` switches (role switch, fires `hdk-toggle` with `detail.checked`, the requested new state), an
 * `action` does something (fires `hdk-press`) and an `open` tile opens a popup (a chevron beside the name, fires
 * `hdk-open`, never guarded: opening changes nothing).
 *
 * `guarded` protects a toggle or an action against a tap by mistake while scrolling: it fires by holding it (`holdMs`)
 * or by a double tap; one tap only shows a hint bubble above the tile. Keyboard and screen readers fire at once.
 * Nothing moves or changes its size because of the hint.
 */
export class HdkTile extends LitElement {
  @property() name = "";
  @property() text = "";
  @property({ reflect: true }) state: TileState = "idle";
  @property() kind: TileKind = "toggle";
  /** How many devices are in this choice; shown as a badge when set. */
  @property({ type: Number }) count?: number;
  /** One line with the name in the middle (a preset), without the state line. */
  @property({ type: Boolean, reflect: true }) centered = false;
  @property({ type: Boolean }) disabled = false;
  /** A command of this tile is on its way (`Pending`): the tile pulses towards the accent until it arrives. */
  @property({ type: Boolean, reflect: true }) pending = false;
  /** An `action` tile that is the chosen option (a preset, a mode, a selected room): said by `aria-pressed`, not by colour alone. */
  @property({ type: Boolean }) pressed?: boolean;
  /** Spoken name; without it the visible text (name, state, count). */
  @property() label = "";
  @property({ type: Boolean }) guarded = false;
  @property({ type: Number }) holdMs = 550;
  @property({ type: Number }) doubleTapMs = 400;
  @property({ type: Number }) hintSeconds = 3;
  @property() hint = "Press and hold, or tap twice.";
  /** Where the hint bubble sits above the tile: a tile at the edge of the card aligns it to its own edge, so it stays inside. */
  @property() hintAlign: "start" | "center" | "end" = "center";

  private readonly hints = new HintState(this);
  private readonly gesture = new HoldOrDoubleTap(() => ({ holdMs: this.holdMs, doubleTapMs: this.doubleTapMs }));

  static styles = [
    hintStyles,
    joinedStyles,
    css`
      :host {
        position: relative;
        display: block;
        min-width: 0;
        container-type: inline-size;
      }
      button {
        position: relative;
        /* The name starts at the top in every tile of a row, whatever the height of the tallest one. */
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        min-height: 60px;
        margin: 0;
        padding: 10px 12px;
        border: 0;
        border-radius: 12px;
        background: var(--hdk-tile, #1c1c1e);
        color: var(--hdk-tile-text, #fff);
        font: inherit;
        text-align: start;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
      }
      :host([state="off"]) button {
        background: transparent;
        box-shadow: inset 0 0 0 1px var(--hdk-tile-border, rgb(84 84 88 / 65%));
      }
      :host([state="on"]) button {
        background: var(--hdk-tile-on, #0a6ed1);
        color: var(--hdk-tile-on-text, #fff);
        box-shadow: inset 0 0 0 1.5px var(--hdk-tile-on-border, transparent);
      }
      :host([state="mixed"]) button {
        background: var(--hdk-tile-mixed, #17395d);
      }
      /* Sent and on its way: the fill goes between its own and the accent until Home Assistant reports the result. */
      :host([pending]) button {
        animation: hdk-pending 1.3s ease-in-out infinite alternate;
      }
      @keyframes hdk-pending {
        to {
          background: var(--hdk-tile-on, #0a6ed1);
          color: var(--hdk-tile-on-text, #fff);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        :host([pending]) button {
          animation: none;
          background: var(--hdk-tile-mixed, #17395d);
          /* Not by colour alone: a dashed accent outline marks the command on its way. */
          outline: 1.5px dashed var(--hdk-tile-on, #0a6ed1);
          outline-offset: -1.5px;
        }
      }
      .name {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        font-size: 15px;
        line-height: 20px;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .name > span:first-child {
        flex: 1;
        min-width: 0;
      }
      .chevron {
        flex: none;
        font-weight: 400;
        color: var(--hdk-secondary, #98989f);
      }
      .text {
        display: block;
        font-size: 13px;
        line-height: 18px;
        color: var(--hdk-secondary, #98989f);
      }
      :host([state="on"]) .text,
      :host([state="on"]) .chevron {
        color: var(--hdk-tile-on-sub, #fff);
      }
      :host([centered]) button {
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 52px;
        text-align: center;
      }
      :host([centered]) .name {
        font-size: 17px;
        line-height: 22px;
      }
      :host([centered]) .name > span:first-child {
        flex: 0 1 auto;
      }
      /* A narrow centred tile (four modes in a row on a phone): a smaller name and less padding, so „Chlazení“ and „WindFree“ keep clear of the edges. */
      @container (max-width: 100px) {
        :host([centered]) button {
          padding: 10px 6px;
        }
        :host([centered]) .name {
          font-size: 15px;
          line-height: 20px;
        }
      }
      .count {
        flex: none;
        display: grid;
        place-items: center;
        min-width: 22px;
        height: 22px;
        box-sizing: border-box;
        padding: 0 6px;
        border-radius: 11px;
        background: var(--hdk-tile-badge, rgb(255 255 255 / 16%));
        font-size: 13px;
        line-height: 18px;
        font-weight: 600;
      }
      button:active:not(:disabled),
      button.nudge {
        filter: brightness(1.18);
      }
      button:disabled {
        cursor: default;
        opacity: 0.45;
      }
      button:focus-visible {
        outline: 2px solid var(--hdk-accent, #0a84ff);
        outline-offset: 2px;
      }
      .hint.start {
        right: auto;
        left: 0;
      }
      .hint.start i {
        left: 25px;
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
    `,
  ];

  /** The state line is text from parts („WindFree · 24°“): it breaks only at the dot, and the dot goes (Text z částí). */
  protected updated(): void {
    fitJoined(this.renderRoot, String(Math.round(this.getBoundingClientRect().width)));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.gesture.dispose();
    this.hints.dispose();
  }

  render(): TemplateResult {
    const toggle = this.kind === "toggle";
    const count = this.count === undefined ? null : html`<span class="count">${this.count}</span>`;
    return html`<button
        type="button"
        role=${toggle ? "switch" : "button"}
        class=${this.hints.nudge ? "nudge" : ""}
        aria-checked=${toggle ? (this.state === "on" ? "true" : "false") : nothing}
        aria-pressed=${this.kind === "action" && this.pressed !== undefined ? (this.pressed ? "true" : "false") : nothing}
        aria-busy=${this.pending ? "true" : nothing}
        aria-haspopup=${this.kind === "open" ? "dialog" : nothing}
        aria-label=${this.label || nothing}
        ?disabled=${this.disabled}
        @click=${this.onClick}
        @pointerdown=${this.onDown}
        @pointerup=${this.release}
        @pointerleave=${this.release}
        @pointercancel=${this.release}
        @contextmenu=${(event: Event) => this.protected && event.preventDefault()}
      ><span class="name"><span>${this.name}</span>${this.kind === "open" ? html`<span class="chevron" aria-hidden="true">›</span>` : null}</span>${this.centered
          ? count
          : html`<span class="text">${joinedText(this.text)}${count}</span>`}</button>
      <span class="sr" aria-live="polite">${this.hints.hint ? this.hint : ""}</span>
      ${this.hints.hint
        ? html`<div class="hint above ${this.hintAlign}" aria-hidden="true"><i></i><span style="position: relative">${this.hint}</span></div>`
        : null}`;
  }

  /** Opening a popup changes nothing, so an `open` tile is never protected. */
  private get protected(): boolean {
    return this.guarded && this.kind !== "open";
  }

  private emit(): void {
    this.hints.hide();
    const [type, detail] =
      this.kind === "toggle" ? ["hdk-toggle", { checked: this.state !== "on" }] : this.kind === "open" ? ["hdk-open", {}] : ["hdk-press", {}];
    this.dispatchEvent(new CustomEvent(type as string, { detail, bubbles: true, composed: true }));
  }

  private onDown(event: PointerEvent): void {
    if (!this.protected || this.disabled || event.button > 0) return;
    this.gesture.start(() => this.emit());
  }

  private release = (): void => {
    this.gesture.release();
  };

  private onClick(event: MouseEvent): void {
    if (this.disabled) return;
    if (!this.protected) {
      this.emit();
      return;
    }
    // Keyboard and screen readers click without a pointer (detail 0): deliberate, so at once.
    if (event.detail === 0) {
      this.gesture.cancel();
      this.emit();
      return;
    }
    const tap = this.gesture.tap("tile", event.timeStamp);
    if (tap === "double") {
      this.emit();
    } else if (tap === "single") {
      this.hints.show(this.hintSeconds);
    }
  }
}
