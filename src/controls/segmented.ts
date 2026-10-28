import { LitElement, css, html } from "lit";
import { property, state } from "lit/decorators.js";
import type { TemplateResult } from "lit";
import { HoldOrDoubleTap } from "../gesture";
import { HintState, hintStyles } from "./hint";

export interface SegmentOption {
  value: string;
  label: string;
  /** Short line under the label (optional), e.g. a temperature. */
  detail?: string;
  disabled?: boolean;
}

/**
 * Choice of one of a few options (role radiogroup), Apple HIG Segmented controls (CURRENT_SPEC.md,
 * Vzhled podle Apple HIG, Segmentový ovladač): a capsule 48 px high (66 px when an option has a
 * second line, 40 px `compact`) with a white thumb that slides under the chosen option, which gets
 * a black label. Fires `hdk-select` with `detail.value`.
 *
 * `guarded` makes it a protected control (Režim Přetoky | Boost): it switches by dragging the thumb
 * to the other option, by holding the other option (`holdMs`) or by a double tap on it; one tap
 * nudges the thumb and shows a hint bubble. Keyboard (arrows) and screen readers switch at once.
 */
export class HdkSegmented extends LitElement {
  @property({ attribute: false }) options: SegmentOption[] = [];
  @property() value = "";
  @property() label = "";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) compact = false;
  @property({ type: Boolean }) guarded = false;
  @property({ type: Number }) holdMs = 550;
  @property({ type: Number }) doubleTapMs = 400;
  @property({ type: Number }) hintSeconds = 3;
  @property() hint = "Press and hold, drag, or tap twice.";

  /** Drag offset of the thumb in px, and the option being nudged toward. */
  @state() private _dx = 0;
  @state() private _dragging = false;

  private readonly hints = new HintState(this);
  private nudgeIndex = 0;
  private readonly gesture = new HoldOrDoubleTap(() => ({ holdMs: this.holdMs, doubleTapMs: this.doubleTapMs }));
  private swallowClick = false;
  private drag?: { x: number; width: number; index: number; moved: boolean; id: number };

  static styles = [
    hintStyles,
    css`
      :host {
        position: relative;
        display: block;
      }
      .track {
        position: relative;
        display: grid;
        grid-template-columns: repeat(var(--n), minmax(0, 1fr));
        box-sizing: border-box;
        min-height: 48px;
        padding: 3px;
        border-radius: 999px;
        background: var(--hdk-track, #2c2c2e);
        user-select: none;
        -webkit-user-select: none;
      }
      .track.guarded {
        touch-action: pan-y;
      }
      .track.compact {
        min-height: 40px;
        background: var(--hdk-track-compact, #3a3a3c);
      }
      .track.tall {
        min-height: 66px;
      }
      .thumb {
        position: absolute;
        top: 3px;
        bottom: 3px;
        left: 3px;
        width: calc((100% - 6px) / var(--n));
        box-sizing: border-box;
        border-radius: 999px;
        background: var(--hdk-seg-thumb, #fff);
        box-shadow: 0 2px 6px rgb(0 0 0 / 30%);
        transform: translateX(calc(var(--i) * 100% + var(--dx, 0px)));
        transition: transform 0.28s cubic-bezier(0.3, 1.2, 0.5, 1);
      }
      .track.dragging .thumb {
        transition: none;
      }
      .thumb[hidden] {
        display: none;
      }
      button {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 0;
        min-height: 44px;
        padding: 0 8px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--hdk-seg-text, #ebebf5);
        font: inherit;
        font-size: 17px;
        font-weight: 400;
        line-height: 22px;
        cursor: pointer;
        transition: color 0.2s;
        touch-action: manipulation;
        -webkit-touch-callout: none;
      }
      .track.compact button {
        min-height: 34px;
        padding: 0 2px;
        font-size: 14px;
        line-height: 20px;
      }
      .track.guarded button {
        touch-action: pan-y;
      }
      button .detail {
        font-size: 13px;
        line-height: 18px;
      }
      button[aria-checked="true"] {
        color: var(--hdk-seg-selected, #000);
        font-weight: 600;
      }
      button:focus-visible {
        outline: 2px solid var(--hdk-accent, #0a84ff);
        outline-offset: -3px;
      }
      button:disabled {
        cursor: default;
        opacity: 0.5;
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
        .thumb,
        button {
          transition: none;
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
    const index = this.options.findIndex((option) => option.value === this.value);
    const enabled = this.options.filter((option) => !option.disabled);
    const tabbable = this.options[index]?.value ?? enabled[0]?.value;
    // A nudge moves the thumb a third of the way to the tapped option (not at all with reduced motion, see CSS).
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nudge = this.hints.nudge && !calm ? Math.sign(this.nudgeIndex - index) * 14 : 0;
    const dx = this._dragging ? this._dx : nudge;
    return html`<div
        class="track ${this.compact ? "compact" : ""} ${this.guarded ? "guarded" : ""} ${this._dragging ? "dragging" : ""} ${this.options.some((option) => option.detail) ? "tall" : ""}"
        role="radiogroup"
        aria-label=${this.label}
        style="--n:${Math.max(1, this.options.length)};--i:${Math.max(0, index)};--dx:${dx}px"
        @keydown=${this.onKey}
        @pointerdown=${this.onDown}
        @pointermove=${this.onMove}
        @pointerup=${this.onUp}
        @pointercancel=${this.onCancel}
        @contextmenu=${(event: Event) => this.guarded && event.preventDefault()}
      >
        <span class="thumb" aria-hidden="true" ?hidden=${index < 0}></span>
        ${this.options.map(
          (option, i) => html`<button
            type="button"
            role="radio"
            aria-checked=${option.value === this.value ? "true" : "false"}
            tabindex=${option.value === tabbable ? 0 : -1}
            ?disabled=${this.disabled || option.disabled}
            data-value=${option.value}
            data-index=${i}
            @click=${(event: MouseEvent) => this.onClick(event, option.value, i)}
          >
            <span>${option.label}</span>${option.detail ? html`<span class="detail">${option.detail}</span>` : null}
          </button>`,
        )}
      </div>
      <span class="sr" aria-live="polite">${this.hints.hint ? this.hint : ""}</span>
      ${this.hints.hint ? html`<div class="hint above ${this.compact ? "end" : "center"}" aria-hidden="true"><i></i><span style="position: relative">${this.hint}</span></div>` : null}`;
  }

  private select(value: string): void {
    if (this.disabled || value === this.value) return;
    this.gesture.release();
    this.hints.hide();
    this.dispatchEvent(new CustomEvent("hdk-select", { detail: { value }, bubbles: true, composed: true }));
  }

  private onClick(event: MouseEvent, value: string, i: number): void {
    if (this.disabled || value === this.value) return;
    if (!this.guarded) {
      this.select(value);
      return;
    }
    // Keyboard and screen readers click without a pointer (detail 0): deliberate, so at once.
    if (event.detail === 0) {
      this.gesture.cancel();
      this.select(value);
      return;
    }
    const tap = this.gesture.tap(String(i), event.timeStamp);
    if (this.swallowClick || tap === "none") {
      // The click that ends a drag or a hold: the control has switched (or snapped back) already.
      this.swallowClick = false;
      return;
    }
    // The second tap on the same option within `doubleTapMs` switches; a single tap nudges and shows the hint.
    if (tap === "double") {
      this.select(value);
    } else {
      this.nudgeIndex = i;
      this.hints.show(this.hintSeconds);
    }
  }

  private onDown(event: PointerEvent): void {
    if (!this.guarded || this.disabled || event.button > 0) return;
    const track = event.currentTarget as HTMLElement;
    const index = this.options.findIndex((option) => option.value === this.value);
    this.swallowClick = false;
    this.drag = { x: event.clientX, width: (track.getBoundingClientRect().width - 6) / Math.max(1, this.options.length), index, moved: false, id: event.pointerId };
    // Holding another option switches to it.
    const target = (event.target as HTMLElement).closest<HTMLElement>("button[data-index]");
    const i = target ? Number(target.dataset.index) : -1;
    // Every press is tracked (a tap needs it); only a press on another enabled option can hold.
    const holdable = i >= 0 && i !== index && !this.options[i]?.disabled;
    this.gesture.start(() => {
      if (holdable) {
        this.drag = undefined;
        this.select(this.options[i].value);
      }
    });
  }

  private onMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      this.gesture.release();
      this.hints.hide();
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    }
    const last = this.options.length - 1;
    this._dx = Math.max(-drag.index * drag.width, Math.min((last - drag.index) * drag.width, delta));
    this._dragging = true;
  }

  private onUp(event: PointerEvent): void {
    const drag = this.drag;
    this.gesture.release();
    if (!drag || drag.id !== event.pointerId) return;
    this.drag = undefined;
    if (!drag.moved) return;
    // The click after a drag must not count as a tap.
    this.swallowClick = true;
    const target = Math.max(0, Math.min(this.options.length - 1, drag.index + Math.round(this._dx / drag.width)));
    this._dx = 0;
    this._dragging = false;
    const option = this.options[target];
    if (option && !option.disabled && target !== drag.index) this.select(option.value);
  }

  private onCancel(): void {
    this.gesture.cancel();
    this.drag = undefined;
    this._dx = 0;
    this._dragging = false;
  }

  private onKey(event: KeyboardEvent): void {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(event.key)) return;
    const enabled = this.options.filter((option) => !option.disabled);
    if (!enabled.length) return;
    const at = enabled.findIndex((option) => option.value === this.value);
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = enabled[(at + step + enabled.length) % enabled.length];
    event.preventDefault();
    this.select(next.value);
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus());
  }
}
