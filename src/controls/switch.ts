import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";
import type { TemplateResult } from "lit";
import { HoldOrDoubleTap } from "../gesture";
import { HintState, hintStyles } from "./hint";

/**
 * Switch in the style of Apple's HIG Toggles (CURRENT_SPEC.md, Vzhled podle Apple HIG, Přepínač):
 * 60 × 32 px track, long white thumb 40 × 26 px, accent colour when on, hit area at least 44 px.
 * It has no label of its own: the list row beside it is the label, so the host row passes the
 * spoken name in `label`. Fires `hdk-toggle` with `detail.checked` (the requested new state).
 *
 * `guarded` makes it a protected switch: it switches by holding it (`holdMs`) or by a double tap;
 * one tap nudges the thumb and shows a hint bubble (`hintPlacement`: above or below the switch).
 * Keyboard and screen readers switch at once.
 */
export class HdkSwitch extends LitElement {
  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property() label = "";
  @property({ type: Boolean }) guarded = false;
  @property({ type: Number }) holdMs = 550;
  @property({ type: Number }) doubleTapMs = 400;
  @property({ type: Number }) hintSeconds = 3;
  @property() hintPlacement: "above" | "below" = "above";
  @property() hint = "Press and hold, or tap twice.";

  private readonly hints = new HintState(this);
  private readonly gesture = new HoldOrDoubleTap(() => ({ holdMs: this.holdMs, doubleTapMs: this.doubleTapMs }));

  static styles = [
    hintStyles,
    css`
      :host {
        position: relative;
        display: inline-block;
        flex: none;
      }
      button {
        position: relative;
        display: block;
        box-sizing: border-box;
        width: 60px;
        height: 32px;
        padding: 0;
        border: 0;
        border-radius: 16px;
        background: var(--hdk-switch-off, rgb(120 120 128 / 36%));
        cursor: pointer;
        transition: background 0.2s;
        touch-action: manipulation;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
      }
      button[aria-checked="true"] {
        background: var(--hdk-accent, #0a84ff);
      }
      /* Invisible extension of the touch target to 44 px. */
      button::after {
        content: "";
        position: absolute;
        inset: -6px -4px;
      }
      .thumb {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 40px;
        height: 26px;
        box-sizing: border-box;
        border-radius: 13px;
        background: #fff;
        box-shadow: 0 2px 6px rgb(0 0 0 / 40%);
        transition: left 0.25s cubic-bezier(0.3, 1.2, 0.5, 1);
      }
      button[aria-checked="true"] .thumb {
        left: 17px;
      }
      /* One tap on a protected switch: the thumb moves toward the new position and back. */
      button.nudge[aria-checked="false"] .thumb {
        left: 9px;
      }
      button.nudge[aria-checked="true"] .thumb {
        left: 11px;
      }
      button:disabled {
        cursor: default;
        opacity: 0.45;
      }
      button:focus-visible {
        outline: 2px solid var(--hdk-accent, #0a84ff);
        outline-offset: 3px;
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        button,
        .thumb {
          transition: none;
        }
        button.nudge[aria-checked="false"] .thumb {
          left: 3px;
        }
        button.nudge[aria-checked="true"] .thumb {
          left: 17px;
        }
      }
    `,
  ];

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.gesture.dispose();
    this.hints.dispose();
  }

  render(): TemplateResult {
    return html`<button
        type="button"
        role="switch"
        class=${this.hints.nudge ? "nudge" : ""}
        aria-checked=${this.checked ? "true" : "false"}
        aria-label=${this.label}
        ?disabled=${this.disabled}
        @click=${this.onClick}
        @pointerdown=${this.onDown}
        @pointerup=${this.release}
        @pointerleave=${this.release}
        @pointercancel=${this.release}
        @contextmenu=${(event: Event) => this.guarded && event.preventDefault()}
      ><span class="thumb"></span></button>
      <span class="sr" aria-live="polite">${this.hints.hint ? this.hint : ""}</span>
      ${this.hints.hint
        ? html`<div class="hint ${this.hintPlacement} end" aria-hidden="true"><i></i><span style="position: relative">${this.hint}</span></div>`
        : null}`;
  }

  private emit(): void {
    this.hints.hide();
    this.dispatchEvent(new CustomEvent("hdk-toggle", { detail: { checked: !this.checked }, bubbles: true, composed: true }));
  }

  private onDown(event: PointerEvent): void {
    if (!this.guarded || this.disabled || event.button > 0) return;
    this.gesture.start(() => this.emit());
  }

  private release = (): void => {
    this.gesture.release();
  };

  private onClick(event: MouseEvent): void {
    if (this.disabled) return;
    if (!this.guarded) {
      this.emit();
      return;
    }
    // Keyboard and screen readers click without a pointer (detail 0): deliberate, so at once.
    if (event.detail === 0) {
      this.gesture.cancel();
      this.emit();
      return;
    }
    // The click that ends a hold has switched already; the second tap within `doubleTapMs`
    // switches; a single tap only nudges the thumb and shows the hint.
    const tap = this.gesture.tap("switch", event.timeStamp);
    if (tap === "double") {
      this.emit();
    } else if (tap === "single") {
      this.hints.show(this.hintSeconds);
    }
  }
}
