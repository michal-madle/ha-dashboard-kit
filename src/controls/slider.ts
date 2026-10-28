import { LitElement, css, html } from "lit";
import { property, state } from "lit/decorators.js";
import type { TemplateResult } from "lit";

/**
 * Slider in the style of Apple's HIG Sliders and the iOS 27 slider of the design (CURRENT_SPEC.md,
 * Vzhled podle Apple HIG, Posuvník): a capsule 52 px high with a thin 6 px bar filled with the
 * accent colour up to a long white thumb 38 × 24 px, ticks at the steps, the end values below.
 * A native range input underneath, so keyboard and screen readers work. Fires `hdk-input` while
 * dragging and `hdk-change` when the value is set.
 */
export class HdkSlider extends LitElement {
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  /** Distance of the ticks under the bar; 0 = the step. */
  @property({ type: Number }) tickStep = 0;
  @property({ type: Number }) value = 0;
  @property() label = "";
  /** Spoken value, e.g. "40 °C"; defaults to the number. */
  @property() valueText = "";
  /** Texts under the ends of the slider (minimum left, maximum right); empty = none. */
  @property() minLabel = "";
  @property() maxLabel = "";
  @property({ type: Boolean }) disabled = false;

  @state() private _drag?: number;

  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      position: relative;
      height: 52px;
    }
    input {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 52px;
      margin: 0;
      padding: 0 14px;
      border-radius: 26px;
      background: var(--hdk-track, #2c2c2e);
      cursor: pointer;
      touch-action: pan-y;
    }
    input:disabled {
      cursor: default;
      opacity: 0.45;
    }
    input::-webkit-slider-runnable-track {
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, var(--hdk-accent, #0a84ff) 0%, var(--hdk-accent, #0a84ff) var(--fill), var(--hdk-bar, rgb(255 255 255 / 14%)) var(--fill), var(--hdk-bar, rgb(255 255 255 / 14%)) 100%);
    }
    input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      box-sizing: border-box;
      width: 38px;
      height: 24px;
      margin-top: -9px;
      border: 0;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 2px 6px rgb(0 0 0 / 40%);
    }
    input::-moz-range-track {
      height: 6px;
      border-radius: 3px;
      background: var(--hdk-bar, rgb(255 255 255 / 14%));
    }
    input::-moz-range-progress {
      height: 6px;
      border-radius: 3px;
      background: var(--hdk-accent, #0a84ff);
    }
    input::-moz-range-thumb {
      box-sizing: border-box;
      width: 38px;
      height: 24px;
      border: 0;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 2px 6px rgb(0 0 0 / 40%);
    }
    input:focus-visible {
      outline: 2px solid var(--hdk-accent, #0a84ff);
      outline-offset: 2px;
    }
    /* Ticks at the steps, between the thumb centres at both ends. */
    .ticks {
      position: absolute;
      left: 33px;
      right: 33px;
      bottom: 7px;
      height: 5px;
      pointer-events: none;
    }
    .ticks i {
      position: absolute;
      top: 0;
      margin-left: -1px;
      width: 2px;
      height: 5px;
      border-radius: 1px;
      background: var(--hdk-tick, rgb(255 255 255 / 28%));
    }
    .ends {
      display: flex;
      justify-content: space-between;
      padding: 4px 14px 0;
      color: var(--hdk-secondary, #98989f);
      font-size: 13px;
      line-height: 18px;
    }
  `;

  render(): TemplateResult {
    const shown = this._drag ?? this.value;
    const span = this.max - this.min || 1;
    const fraction = Math.max(0, Math.min(1, (shown - this.min) / span));
    // The fill ends under the thumb centre: the thumb centre moves over the track width minus the thumb width.
    const fill = `calc(19px + (100% - 38px) * ${fraction})`;
    const every = this.tickStep || this.step || 1;
    const count = Math.floor(span / every + 1e-9) + 1;
    const ticks = count >= 2 && count <= 40 ? Array.from({ length: count }, (_, k) => html`<i style="left:${(((k * every) / span) * 100).toFixed(2)}%"></i>`) : [];
    return html`<div class="wrap">
        <input
          type="range"
          min=${this.min}
          max=${this.max}
          step=${this.step}
          .value=${String(shown)}
          aria-label=${this.label}
          aria-valuetext=${this.valueText || String(shown)}
          ?disabled=${this.disabled}
          style="--fill: ${fill}"
          @input=${this.onInput}
          @change=${this.onChange}
        />
        <div class="ticks" aria-hidden="true">${ticks}</div>
      </div>
      ${this.minLabel || this.maxLabel ? html`<div class="ends" aria-hidden="true"><span>${this.minLabel}</span><span>${this.maxLabel}</span></div>` : null}`;
  }

  private onInput(event: Event): void {
    this._drag = Number((event.target as HTMLInputElement).value);
    this.dispatchEvent(new CustomEvent("hdk-input", { detail: { value: this._drag }, bubbles: true, composed: true }));
  }

  private onChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this._drag = undefined;
    this.dispatchEvent(new CustomEvent("hdk-change", { detail: { value }, bubbles: true, composed: true }));
  }
}
