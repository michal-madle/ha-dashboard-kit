import { describe, expect, it, vi } from "vitest";
import { fetchHistory, historyRows, parseHistory, stateAt, toMillis } from "../../src/history";
import type { HomeAssistant } from "../../src/types";

// CURRENT_SPEC.md kitu, Entity a data, Historie.

const START = Date.UTC(2026, 10, 21, 0, 0);
const s = (minutes: number) => (START + minutes * 60_000) / 1000;

describe("čas záznamu", () => {
  it("sekundy, milisekundy i text ISO; nic jiného", () => {
    expect(toMillis(1_700_000_000)).toBe(1_700_000_000_000);
    expect(toMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(toMillis("2026-11-21T00:00:00Z")).toBe(START);
    expect(toMillis(undefined)).toBeUndefined();
    expect(toMillis(null)).toBeUndefined();
    expect(toMillis("x")).toBeUndefined();
    expect(toMillis(Number.NaN)).toBeUndefined();
  });
});

describe("řádky záznamu", () => {
  it("stav na začátku okna leží na začátku, řádky v pořadí času, stará i plná podoba", () => {
    const map = parseHistory({ "binary_sensor.okno": [{ s: "off", lu: s(-30) }, { state: "on", last_updated: new Date(START + 600_000).toISOString() }, { s: "off", lu: s(5) }] }, START);
    expect(map["binary_sensor.okno"]).toEqual([{ time: START, state: "off" }, { time: START + 300_000, state: "off" }, { time: START + 600_000, state: "on" }]);
  });

  it("první řádek bez času je stav na začátku; řádek bez stavu se vynechá", () => {
    expect(parseHistory({ a: [{ s: "on" }, { lu: s(1) }, { s: "off" }] }, START).a).toEqual([{ time: START, state: "on" }]);
  });

  it("řádek bez atributů opakuje poslední atributy", () => {
    const map = parseHistory({ "cover.a": [{ s: "open", a: { current_position: 100 }, lu: s(0) }, { s: "closing", lu: s(1) }, { s: "closed", a: { current_position: 0 }, lu: s(2) }] }, START);
    expect(map["cover.a"].map((point) => point.attributes?.current_position)).toEqual([100, 100, 0]);
  });

  it("stav v čase: poslední bod, který není později", () => {
    const points = [{ time: 10, state: "a" }, { time: 20, state: "b" }];
    expect(stateAt(points, 5)).toBeUndefined();
    expect(stateAt(points, 10)).toBe("a");
    expect(stateAt(points, 25)).toBe("b");
    expect(stateAt(undefined, 25)).toBeUndefined();
  });
});

describe("dotaz do záznamu", () => {
  const fakeHass = (answer: unknown) => {
    const callWS = vi.fn(async () => answer);
    return { hass: { states: {}, callWS } as unknown as HomeAssistant, callWS };
  };

  it("jeden dotaz se stavem na začátku; bez atributů krátká odpověď", async () => {
    const { hass, callWS } = fakeHass({ a: [{ s: "on", lu: s(1) }] });
    expect(await fetchHistory(hass, ["a"], START, START + 3_600_000)).toEqual({ a: [{ time: START + 60_000, state: "on" }] });
    expect(callWS).toHaveBeenCalledWith({
      type: "history/history_during_period",
      start_time: "2026-11-21T00:00:00.000Z",
      end_time: "2026-11-21T01:00:00.000Z",
      entity_ids: ["a"],
      include_start_time_state: true,
      significant_changes_only: false,
      minimal_response: true,
      no_attributes: true,
    });
  });

  it("s atributy celé řádky; bez entit se neptá; prázdná odpověď je prázdná historie", async () => {
    const { hass, callWS } = fakeHass(null);
    expect(await historyRows(hass, ["cover.a"], START, START + 1, { attributes: true })).toEqual({});
    expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ minimal_response: false, no_attributes: false }));
    expect(await fetchHistory(hass, [], START, START + 1)).toEqual({});
    expect(callWS).toHaveBeenCalledTimes(1);
  });

  it("chyba dotazu jde ke kartě", async () => {
    const hass = { states: {}, callWS: async () => { throw new Error("no recorder"); } } as unknown as HomeAssistant;
    await expect(fetchHistory(hass, ["a"], START, START + 1)).rejects.toThrow("no recorder");
  });
});
