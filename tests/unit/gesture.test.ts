import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoldOrDoubleTap } from "../../src/gesture";

// CURRENT_SPEC.md, Chráněné ovládání.
describe("podržení nebo dvojklep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const make = () => new HoldOrDoubleTap(() => ({ holdMs: 550, doubleTapMs: 400 }));

  it("podržení po holdMs zavolá akci a následný tap je none", () => {
    const gesture = make();
    const hold = vi.fn();
    gesture.start(hold);
    vi.advanceTimersByTime(549);
    expect(hold).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hold).toHaveBeenCalledOnce();
    gesture.release();
    expect(gesture.tap("a", 1000)).toBe("none");
  });

  it("krátké klepnutí je single, druhé do doubleTapMs na stejný klíč je double", () => {
    const gesture = make();
    const hold = vi.fn();
    gesture.start(hold);
    gesture.release();
    expect(gesture.tap("a", 1000)).toBe("single");
    expect(gesture.pending("a")).toBe(true);
    gesture.start(hold);
    gesture.release();
    expect(gesture.tap("a", 1399)).toBe("double");
    expect(gesture.pending("a")).toBe(false);
    expect(hold).not.toHaveBeenCalled();
  });

  it("pozdní druhé klepnutí nebo jiný klíč je zase single", () => {
    const gesture = make();
    gesture.start(() => {});
    expect(gesture.tap("a", 0)).toBe("single");
    gesture.start(() => {});
    expect(gesture.tap("a", 401)).toBe("single");
    gesture.start(() => {});
    expect(gesture.tap("b", 500)).toBe("single");
  });

  it("zrušený stisk (pointercancel) a tap bez stisku nic nedělají; forget zapomene první klepnutí", () => {
    const gesture = make();
    gesture.start(() => {});
    gesture.cancel();
    expect(gesture.tap("a", 0)).toBe("none");
    gesture.start(() => {});
    expect(gesture.tap("a", 10)).toBe("single");
    gesture.forget();
    gesture.start(() => {});
    expect(gesture.tap("a", 20)).toBe("single");
  });

  it("časy se čtou při každém stisku", () => {
    let hold = 550;
    const gesture = new HoldOrDoubleTap(() => ({ holdMs: hold, doubleTapMs: 400 }));
    const fired = vi.fn();
    hold = 100;
    gesture.start(fired);
    vi.advanceTimersByTime(100);
    expect(fired).toHaveBeenCalledOnce();
  });
});
