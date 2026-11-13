import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { PropertyValues, TemplateResult } from "lit";
import { typographyStyles } from "../typography";

/** Pull-down distance (px) or speed (px/ms) that closes the sheet, and the slop before a move is a drag (iOS sheet). */
const CLOSE_DISTANCE = 100;
const CLOSE_SPEED = 0.6;
const DRAG_SLOP = 6;

/**
 * A sheet from the bottom (CURRENT_SPEC.md, Ovládací prvky, List odspodu; the frame of the popups of Klima): a grabber,
 * a title with an optional line under it and a ✕. It closes by ✕, a tap outside, Escape or by pulling the top part
 * down; it never closes itself: it fires `hdk-close` and the card sets `open` to false. The body is the slotted content,
 * so the card styles it. On a wide screen (600 px and more) it is a dialog in the middle.
 *
 * While open, Tab stays inside it and a drag over the dimmed area does not move the page below; when it closes, the
 * focus goes back where it was. Nothing outside the sheet moves or changes its size because of it.
 */
export class HdkSheet extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() heading = "";
  @property() sub = "";
  /** Spoken name of ✕, in the language of the card. */
  @property() closeLabel = "Close";
  @state() private dragY = 0;
  @state() private dragging = false;

  private drag?: { pointerId: number; startY: number; startTime: number };
  private touchY?: number;
  private touchOnSlider = false;
  private returnFocus?: HTMLElement | null;

  // The popup has the one typeface of the cards whichever card shows it (DASHBOARD_UX_SYSTEM.md, Písmo).
  static styles = [typographyStyles, css`
    :host {
      display: contents;
    }
    .backdrop {
      position: fixed;
      z-index: 9;
      inset: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgb(0 0 0 / calc(var(--hdk-sheet-backdrop, 60%) * var(--backdrop-opacity, 1)));
      overscroll-behavior: contain;
      touch-action: none;
    }
    .sheet {
      box-sizing: border-box;
      width: 100%;
      max-width: 460px;
      max-height: 90vh;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 16px 16px max(16px, env(safe-area-inset-bottom));
      border: 1px solid var(--hdk-sheet-border, rgb(255 255 255 / 10%));
      border-bottom: 0;
      border-radius: 24px 24px 0 0;
      background: var(--hdk-sheet-bg, #1c1c1e);
      color: var(--hdk-sheet-text, #ffffff);
      animation: rise 220ms ease-out;
      transition: transform 220ms ease-out;
    }
    .sheet:focus {
      outline: none;
    }
    .sheet.dragging {
      transition: none;
    }
    .top {
      margin: -8px -16px 0;
      padding: 8px 16px 0;
      touch-action: none;
      cursor: grab;
    }
    .grabber {
      width: 36px;
      height: 5px;
      margin: 0 auto 10px;
      border-radius: 3px;
      background: var(--hdk-sheet-grabber, rgb(255 255 255 / 28%));
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      line-height: 26px;
    }
    .sub {
      color: var(--hdk-secondary, #9a9aa0);
      font-size: 14px;
      line-height: 20px;
    }
    .close {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 44px;
      width: 44px;
      height: 44px;
      margin: -8px -8px 0 0;
      padding: 0;
      border: 0;
      background: none;
      color: var(--hdk-secondary, #9a9aa0);
      cursor: pointer;
    }
    .close span {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--hdk-sheet-button, rgb(118 118 128 / 24%));
    }
    .close svg {
      width: 12px;
      height: 12px;
    }
    .close:focus-visible {
      border-radius: 50%;
      outline: 2px solid var(--hdk-accent, #0a84ff);
      outline-offset: -2px;
    }
    @keyframes rise {
      from {
        transform: translateY(24px);
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sheet {
        animation: none;
        transition: none;
      }
    }
    @media (min-width: 600px) {
      .backdrop {
        align-items: center;
      }
      .sheet {
        border-bottom: 1px solid var(--hdk-sheet-border, rgb(255 255 255 / 10%));
        border-radius: 24px;
      }
      .grabber {
        display: none;
      }
    }
  `];

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("open") && this.open && !changed.get("open")) {
      // The element that opened the sheet gets the focus back when it closes.
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      this.returnFocus = active as HTMLElement | null;
      this.dragY = 0;
    }
  }

  protected updated(changed: PropertyValues): void {
    if (!changed.has("open")) return;
    if (this.open) {
      this.renderRoot.querySelector<HTMLElement>(".sheet")?.focus();
    } else if (changed.get("open")) {
      this.returnFocus?.focus?.();
      this.returnFocus = undefined;
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent("hdk-close", { bubbles: true, composed: true }));
  }

  /** The focusable elements of the sheet: its ✕ and the slotted content. */
  private focusable(): HTMLElement[] {
    const close = this.renderRoot.querySelector<HTMLElement>(".close");
    const inside = [...this.querySelectorAll<HTMLElement>("*")].flatMap((element) => {
      const target = element.shadowRoot?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled])") ?? element;
      return target.matches("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])") ? [target] : [];
    });
    return [...(close ? [close] : []), ...inside];
  }

  private keydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = this.focusable();
    if (!items.length) return;
    const path = event.composedPath();
    const index = items.findIndex((item) => path.includes(item));
    const next = event.shiftKey ? items[index <= 0 ? items.length - 1 : index - 1] : items[index === -1 || index === items.length - 1 ? 0 : index + 1];
    event.preventDefault();
    next.focus();
  };

  private touchStart = (event: TouchEvent): void => {
    this.touchY = event.touches[0]?.clientY;
    // A finger on a slider drags the slider: cancelling its moves would freeze it (iOS).
    this.touchOnSlider = event.composedPath().some((node) => node instanceof HTMLElement && (node.localName.endsWith("-slider") || (node instanceof HTMLInputElement && node.type === "range")));
  };

  private touchMove = (event: TouchEvent): void => {
    if (!this.touchOnSlider && event.cancelable && this.cannotScroll(event, (event.touches[0]?.clientY ?? 0) - (this.touchY ?? 0))) event.preventDefault();
  };

  private wheel = (event: WheelEvent): void => {
    if (event.cancelable && !event.ctrlKey && this.cannotScroll(event, -event.deltaY)) event.preventDefault();
  };

  /** `movement` > 0 pulls the content down (towards its top), < 0 up. Outside the sheet nothing scrolls. */
  private cannotScroll(event: Event, movement: number): boolean {
    const sheet = this.renderRoot.querySelector<HTMLElement>(".sheet");
    if (!sheet || !event.composedPath().includes(sheet)) return true;
    const scrolls = sheet.scrollHeight > sheet.clientHeight + 1;
    return !scrolls || (movement > 0 && sheet.scrollTop <= 0) || (movement < 0 && sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 1);
  }

  private dragStart = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.drag = { pointerId: event.pointerId, startY: event.clientY, startTime: performance.now() };
  };

  private dragMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientY - drag.startY;
    if (!this.dragging) {
      if (distance < DRAG_SLOP) return;
      // Capture only once it is a drag, so a tap on ✕ still clicks.
      this.dragging = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    this.dragY = Math.max(0, distance);
  };

  private dragEnd = (event: PointerEvent): void => {
    const drag = this.drag;
    this.drag = undefined;
    if (!drag || !this.dragging) return;
    this.dragging = false;
    const distance = Math.max(0, event.clientY - drag.startY);
    const speed = distance / Math.max(1, performance.now() - drag.startTime);
    if (event.type === "pointerup" && (distance > CLOSE_DISTANCE || speed > CLOSE_SPEED)) this.close();
    else this.dragY = 0;
  };

  render(): TemplateResult | typeof nothing {
    if (!this.open) return nothing;
    return html`<div
      class="backdrop"
      part="backdrop"
      style=${`--backdrop-opacity: ${Math.max(0, 1 - this.dragY / 400).toFixed(2)}`}
      @click=${() => this.close()}
      @keydown=${this.keydown}
      @touchstart=${this.touchStart}
      @touchmove=${this.touchMove}
      @wheel=${this.wheel}
    >
      <div
        class="sheet ${this.dragging ? "dragging" : ""}"
        part="sheet"
        style=${this.dragY > 0 ? `transform: translateY(${this.dragY}px)` : ""}
        role="dialog"
        aria-modal="true"
        aria-labelledby="title"
        tabindex="-1"
        @click=${(event: Event) => event.stopPropagation()}
      >
        <div class="top" @pointerdown=${this.dragStart} @pointermove=${this.dragMove} @pointerup=${this.dragEnd} @pointercancel=${this.dragEnd}>
          <div class="grabber" aria-hidden="true"></div>
          <div class="head">
            <div>
              <h2 id="title">${this.heading}</h2>
              ${this.sub ? html`<div class="sub">${this.sub}</div>` : nothing}
            </div>
            <button type="button" class="close" aria-label=${this.closeLabel} @click=${() => this.close()}>
              <span aria-hidden="true"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"></path></svg></span>
            </button>
          </div>
        </div>
        <slot></slot>
      </div>
    </div>`;
  }
}
