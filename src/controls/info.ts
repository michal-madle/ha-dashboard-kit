import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { PropertyValues, TemplateResult } from "lit";
import { typographyStyles } from "../typography";

/** The one ⓘ bubble open on the page: opening another closes it. */
let openInfo: HdkInfo | undefined;

/**
 * ⓘ (CURRENT_SPEC.md kitu, Ovládací prvky, Vysvětlivka; DASHBOARD_UX_SYSTEM.md: ⓘ is the one place for explanations,
 * dříve `hint()` ve Slunci karty Energie). A small ⓘ in a touch area of 44 × 44 px; a tap opens a bubble with `text`
 * over the card, a second tap, a tap on the bubble or Escape closes it. One bubble at a time. The bubble never takes
 * room: it lies over the nearest positioned box of the card (`inset: 48px 12px auto`), which the card decides.
 */
export class HdkInfo extends LitElement {
  /** Accessible name of the button ("Vysvětlivka"), in the language of the card. */
  @property() label = "";
  /** The explanation in the bubble, in the language of the card. */
  @property() text = "";
  @state() open = false;

  static styles = [
    typographyStyles,
    css`
      :host {
        display: inline-flex;
        flex: none;
      }
      button {
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        margin: -13px -13px -13px 0;
        padding: 0;
        border: 0;
        border-radius: 22px;
        background: none;
        cursor: pointer;
      }
      button:focus-visible {
        outline: 2px solid var(--hdk-accent, #0a84ff);
        outline-offset: -6px;
      }
      svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: var(--hdk-secondary, #98989f);
        stroke-width: 1.8;
        stroke-linecap: round;
      }
      svg circle:last-child {
        fill: var(--hdk-secondary, #98989f);
        stroke: none;
      }
      .note {
        position: absolute;
        z-index: 5;
        inset: 48px 12px auto;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--hdk-bubble, #3a3a3c);
        box-shadow: 0 8px 24px var(--hdk-pop-shadow, rgb(0 0 0 / 55%));
        color: var(--hdk-bubble-text, #ffffff);
        font-size: 13px;
        line-height: 19px;
        text-align: left;
        cursor: pointer;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback(): void {
    document.removeEventListener("keydown", this.onKey);
    if (openInfo === this) openInfo = undefined;
    this.open = false;
    super.disconnectedCallback();
  }

  /** Closes the bubble (the card can close it, e.g. when it switches a tab). */
  close(): void {
    this.open = false;
  }

  protected updated(changed: PropertyValues): void {
    if (!changed.has("open")) return;
    if (this.open) {
      if (openInfo && openInfo !== this) openInfo.close();
      openInfo = this;
    } else if (openInfo === this) {
      openInfo = undefined;
    }
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.open && event.key === "Escape") this.open = false;
  };

  protected render(): TemplateResult {
    return html`<button type="button" aria-label=${this.label} aria-expanded=${this.open ? "true" : "false"} @click=${() => { this.open = !this.open; }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2"></circle><path d="M12 11v5.2"></path><circle cx="12" cy="7.6" r="0.7"></circle></svg>
      </button>${this.open ? html`<div class="note" role="note" @click=${() => { this.open = false; }}>${this.text}</div>` : nothing}`;
  }
}
