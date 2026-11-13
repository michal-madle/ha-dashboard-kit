import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Pending } from "../../src/pending";
import type { HassEntity, HomeAssistant } from "../../src/types";

// CURRENT_SPEC.md kitu, Ovládací prvky, Odezva.

const hassOf = (states: Record<string, HassEntity>): HomeAssistant => ({ states, callService: async () => undefined, callWS: async () => undefined as never });
const cover = (state: string, position: number): HassEntity => ({ state, attributes: { current_position: position } });

describe("odezva příkazu", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("pulzuje do cíle; stav, který už platí, nepulzuje", () => {
    const changed = vi.fn();
    const pending = new Pending(changed, 5000);
    const command = { entities: ["cover.a"], done: (hass: HomeAssistant) => hass.states["cover.a"]?.state === "closed" };
    pending.start("a", hassOf({ "cover.a": cover("open", 100) }), command);
    expect(pending.has("a")).toBe(true);
    pending.check(hassOf({ "cover.a": cover("closed", 0) }));
    expect(pending.has("a")).toBe(false);
    pending.start("b", hassOf({ "cover.a": cover("closed", 0) }), command);
    expect(pending.has("b")).toBe(false);
    expect(changed).toHaveBeenCalled();
  });

  it("bez změny po dobu stallMs skončí; každá změna dá znovu celou dobu", () => {
    const pending = new Pending(() => undefined, 5000);
    const command = { entities: ["cover.a"], done: (hass: HomeAssistant) => hass.states["cover.a"]?.state === "closed" };
    pending.start("a", hassOf({ "cover.a": cover("open", 100) }), command);
    vi.advanceTimersByTime(4000);
    pending.check(hassOf({ "cover.a": cover("closing", 60) }));
    vi.advanceTimersByTime(4000);
    expect(pending.has("a")).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(pending.has("a")).toBe(false);
  });
});
