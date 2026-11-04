import { css } from "lit";

/*
 * Hint of the protected controls (CURRENT_SPEC.md, Chráněné ovládání): one tap on a control that
 * does something physical only nudges it toward the new position and shows a bubble that says how
 * to switch it (hold, double tap). The bubble only overlays: it never moves anything (the control
 * must not be clipped by `overflow: hidden` of its surroundings).
 */

/** The 'nudge' (short move toward the new position) and the hint bubble of one control. */
export class HintState {
  nudge = false;
  hint = false;
  private nudgeTimer?: number;
  private hintTimer?: number;

  constructor(private readonly host: { requestUpdate(): void }) {}

  show(hintSeconds: number): void {
    this.nudge = true;
    this.hint = true;
    window.clearTimeout(this.nudgeTimer);
    window.clearTimeout(this.hintTimer);
    this.nudgeTimer = window.setTimeout(() => {
      this.nudge = false;
      this.host.requestUpdate();
    }, 450);
    this.hintTimer = window.setTimeout(() => {
      this.hint = false;
      this.host.requestUpdate();
    }, hintSeconds * 1000);
    this.host.requestUpdate();
  }

  hide(): void {
    window.clearTimeout(this.nudgeTimer);
    window.clearTimeout(this.hintTimer);
    this.nudge = false;
    this.hint = false;
    this.host.requestUpdate();
  }

  dispose(): void {
    window.clearTimeout(this.nudgeTimer);
    window.clearTimeout(this.hintTimer);
  }
}

/** Look of the hint bubble (HIG tooltip with an arrow); `below` or `above` the control, aligned to its end. */
export const hintStyles = css`
  .hint {
    position: absolute;
    z-index: 6;
    right: 0;
    padding: 8px 12px;
    border-radius: 12px;
    background: var(--hdk-bubble, #3a3a3c);
    color: var(--hdk-bubble-text, #ffffff);
    box-shadow: 0 6px 20px rgb(0 0 0 / 55%);
    font-size: 13px;
    line-height: 18px;
    width: max-content;
    max-width: 240px;
    pointer-events: none;
    animation: hint-in 0.18s ease-out;
  }
  .hint.below {
    top: calc(100% + 10px);
  }
  .hint.above {
    bottom: calc(100% + 4px);
  }
  .hint.center {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    animation-name: hint-in-center;
  }
  .hint i {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: var(--hdk-bubble, #3a3a3c);
    transform: rotate(45deg);
  }
  .hint.below i {
    top: -5px;
  }
  .hint.above i {
    bottom: -5px;
  }
  .hint.end i {
    right: var(--arrow, 25px);
  }
  .hint.center i {
    left: 50%;
    margin-left: -5px;
  }
  @keyframes hint-in {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
    }
  }
  @keyframes hint-in-center {
    from {
      opacity: 0;
      transform: translateX(-50%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateX(-50%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .hint {
      animation: none;
    }
  }
`;
