import { LitElement, css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { TemplateResult } from "lit";

/**
 * Progress ring (CURRENT_SPEC.md, Ovládací prvky, Kolečko): a full circle that fills clockwise from
 * 12 o'clock with rounded ends and the number centred in it (a unit, when there is one, is smaller
 * under the number: DASHBOARD_UX_SYSTEM.md, pravidlo pro kolečka a měřiče s číslem; a percentage
 * has no unit at all). Without `num` it is only the circle. The card sets the colours through the tokens `--hdk-ring-track`, `--hdk-ring-fill`
 * (the colour of the fill, e.g. green when the goal is reached), `--hdk-ring-text` and
 * `--hdk-ring-sub`. It has `role="img"` and `label` as its name; it moves and animates nothing.
 */
export class HdkRing extends LitElement {
  /** 0 to 1: how much of the circle is filled. */
  @property({ type: Number }) fraction = 0;
  /** Diameter in px. */
  @property({ type: Number }) size = 40;
  /** Thickness of the circle in px. */
  @property({ type: Number }) stroke = 6;
  /** The number in the middle (a text, already formatted); empty = no number. */
  @property() num = "";
  /** The unit under the number (none for a percentage). */
  @property() unit = "";
  /** The accessible name: what the ring says in words. */
  @property() label = "";

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
      flex: none;
      line-height: 0;
    }
    .ring {
      position: relative;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .track {
      stroke: var(--hdk-ring-track, rgb(118 118 128 / 24%));
    }
    .fill {
      stroke: var(--hdk-ring-fill, var(--hdk-accent, #0a84ff));
    }
    .num,
    .unit {
      position: absolute;
      inset: 50% 0 auto;
      text-align: center;
    }
    .num {
      transform: translateY(-50%);
      color: var(--hdk-ring-text, currentColor);
      font-weight: 700;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    /* With a unit the number rises a little to make room for it under the number. */
    .num.with-unit {
      transform: translateY(-62%);
    }
    .unit {
      margin-top: 8px;
      color: var(--hdk-ring-sub, var(--hdk-secondary, #98989f));
      font-size: 10px;
      line-height: 1;
    }
  `;

  protected render(): TemplateResult {
    const { size, stroke } = this;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const fraction = Math.min(1, Math.max(0, Number.isFinite(this.fraction) ? this.fraction : 0));
    const centre = size / 2;
    return html`<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label=${this.label}>
      <svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle class="track" cx=${centre} cy=${centre} r=${radius} fill="none" stroke-width=${stroke}></circle>
        <circle
          class="fill"
          cx=${centre}
          cy=${centre}
          r=${radius}
          fill="none"
          stroke-width=${stroke}
          stroke-linecap="round"
          stroke-dasharray="${(circumference * fraction).toFixed(1)} ${circumference.toFixed(1)}"
          transform="rotate(-90 ${centre} ${centre})"
        ></circle>
      </svg>
      ${this.num
        ? html`<span class="num ${this.unit ? "with-unit" : ""}" style="font-size:${Math.round(size * (size <= 44 ? 0.3 : 0.27))}px">${this.num}</span>${this.unit
            ? html`<span class="unit">${this.unit}</span>`
            : nothing}`
        : nothing}
    </div>`;
  }
}
