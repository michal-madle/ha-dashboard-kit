/*
 * Gesture of the protected controls (CURRENT_SPEC.md, Chráněné ovládání): a control that does
 * something physical or costs money is not triggered by one tap. It is triggered by holding it
 * (`holdMs`) or by a second tap within `doubleTapMs`; a single tap only explains how. Keyboard and
 * screen readers click without a pointer (`event.detail === 0`): that is deliberate, so the
 * control acts at once and does not use this class.
 *
 * Framework-free: the control calls `start` on pointerdown, `release` on pointerup / leave,
 * `cancel` on pointercancel and `tap` when the press ends (pointerup or click).
 */

export interface GestureTimes {
  holdMs: number;
  doubleTapMs: number;
}

export type Tap = "single" | "double" | "none";

export class HoldOrDoubleTap {
  private timer?: number;
  private pressing = false;
  private fired = false;
  private last?: { key: string; time: number };

  /** `times` is read at every press, so changed properties apply at once. */
  constructor(private readonly times: () => GestureTimes) {}

  /** A press began: `onHold` runs when it lasts `holdMs`. */
  start(onHold: () => void): void {
    window.clearTimeout(this.timer);
    this.pressing = true;
    this.fired = false;
    this.timer = window.setTimeout(() => {
      this.fired = true;
      this.last = undefined;
      onHold();
    }, this.times().holdMs);
  }

  /** The pointer was lifted or left: a hold that has not fired yet is cancelled. */
  release(): void {
    window.clearTimeout(this.timer);
  }

  /** The press was interrupted (pointercancel, leaving the control): nothing follows. */
  cancel(): void {
    window.clearTimeout(this.timer);
    this.pressing = false;
    this.fired = false;
  }

  /**
   * The press ended in a tap on `key` at `time` (ms, monotonic). "none": the press was a hold that
   * has fired already (or no press began); "double": the second tap of `key` within `doubleTapMs`;
   * "single": the first tap, remembered for a following second one.
   */
  tap(key: string, time: number): Tap {
    window.clearTimeout(this.timer);
    const wasPressing = this.pressing;
    const fired = this.fired;
    this.pressing = false;
    this.fired = false;
    if (!wasPressing || fired) {
      return "none";
    }
    if (this.last && this.last.key === key && time - this.last.time <= this.times().doubleTapMs) {
      this.last = undefined;
      return "double";
    }
    this.last = { key, time };
    return "single";
  }

  /** Whether `key` was tapped once and no second tap has followed yet. */
  pending(key: string): boolean {
    return this.last?.key === key;
  }

  /** Forget the remembered first tap (a hint was shown, the action was sent …). */
  forget(): void {
    this.last = undefined;
  }

  dispose(): void {
    window.clearTimeout(this.timer);
    this.pressing = false;
    this.fired = false;
    this.last = undefined;
  }
}
