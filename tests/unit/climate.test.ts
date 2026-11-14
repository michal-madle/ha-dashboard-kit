import { describe, expect, it } from "vitest";
import { commonMode, coolingCalls, coolingStateAfter, delayedOff, heatingCalls, modeOf, offeredCooling, range, tapRoom, targets } from "../../src/climate/logic";
import type { HassEntity, HomeAssistant } from "../../src/types";

// CURRENT_SPEC.md kitu, Popup Topení / Klimatizace.

const e = (state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ state, attributes });
const hassOf = (states: Record<string, HassEntity>): HomeAssistant => ({ states, callService: async () => undefined, callWS: async () => undefined as never });
const ac = { hvac_modes: ["off", "cool", "dry", "fan_only", "heat", "auto"], preset_modes: ["none", "sleep", "wind_free"] };

describe("stav místnosti", () => {
  it("topení: auto = Plán, heat = Ručně, heat na 25 °C = Boost, off = Vypnuto, nedostupné nic", () => {
    expect(modeOf("heating", e("auto", { temperature: 21 }))).toBe("plan");
    expect(modeOf("heating", e("heat", { temperature: 22.5 }))).toBe("manual");
    expect(modeOf("heating", e("heat", { temperature: 25 }))).toBe("boost");
    expect(modeOf("heating", e("off"))).toBe("off");
    // Vypnuto for a limited time is a manual target at the frost protection (5 °C).
    expect(modeOf("heating", e("heat", { temperature: 5 }))).toBe("off");
    expect(modeOf("heating", e("unavailable"))).toBeUndefined();
  });

  it("klimatizace: WindFree a Spánek jsou předvolby, heat_cool je Auto", () => {
    expect(modeOf("cooling", e("cool", { preset_mode: "wind_free" }))).toBe("wind_free");
    expect(modeOf("cooling", e("cool", { preset_mode: "sleep" }))).toBe("sleep");
    expect(modeOf("cooling", e("cool", { preset_mode: "none" }))).toBe("cool");
    expect(modeOf("cooling", e("heat_cool"))).toBe("auto");
  });

  it("nabízené režimy klimatizace podle hvac_modes a preset_modes", () => {
    expect(offeredCooling(e("off", ac))).toEqual(["off", "cool", "wind_free", "heat", "fan_only", "dry", "auto", "sleep"]);
    expect(offeredCooling(e("off", { hvac_modes: ["off", "cool"] }))).toEqual(["off", "cool"]);
  });

  it("rozsah: topení po půl stupni, klimatizace po celých, z min_temp a max_temp", () => {
    expect(range("heating", e("auto", { min_temp: 5, max_temp: 25 }))).toEqual({ min: 5, max: 25, step: 0.5 });
    expect(range("cooling", e("cool", { min_temp: 16, max_temp: 30 }))).toEqual({ min: 16, max: 30, step: 1 });
  });
});

describe("výběr místností", () => {
  const rooms = ["a", "b", "c", "d"].map((id) => ({ name: id, entity: `climate.${id}` }));
  const hass = hassOf({ "climate.a": e("cool"), "climate.b": e("off"), "climate.c": e("cool", { preset_mode: "wind_free" }), "climate.d": e("unavailable") });

  it("klepnutí na zapnutou vybere všechny zapnuté, na vypnutou všechny vypnuté", () => {
    expect(tapRoom("cooling", hass, rooms, ["climate.b"], "climate.a")).toEqual(["climate.a", "climate.c"]);
    expect(tapRoom("cooling", hass, rooms, ["climate.a"], "climate.b")).toEqual(["climate.b"]);
  });

  it("klepnutí na vybranou ji z výběru vyjme, poslední zůstane; nedostupná nic nezmění", () => {
    expect(tapRoom("cooling", hass, rooms, ["climate.a", "climate.c"], "climate.c")).toEqual(["climate.a"]);
    expect(tapRoom("cooling", hass, rooms, ["climate.a"], "climate.a")).toEqual(["climate.a"]);
    expect(tapRoom("cooling", hass, rooms, ["climate.a"], "climate.d")).toEqual(["climate.a"]);
  });

  it("společný režim a cíle vybraných", () => {
    const h = hassOf({ "climate.a": e("cool", { temperature: 22 }), "climate.c": e("cool", { temperature: 24, preset_mode: "wind_free" }) });
    expect(commonMode("cooling", h, ["climate.a", "climate.c"])).toBeUndefined();
    expect(commonMode("cooling", h, ["climate.a"])).toBe("cool");
    expect(targets(h, ["climate.a", "climate.c"]).map((item) => item.value)).toEqual([22, 24]);
  });
});

describe("volání topení (Tado CE)", () => {
  const plan = e("auto", { temperature: 20 });
  it("Plán a Vypnuto jsou režim entity", () => {
    expect(heatingCalls("climate.t", plan, { mode: "plan" }, true)).toEqual([{ domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.t", hvac_mode: "auto" } }]);
    expect(heatingCalls("climate.t", plan, { mode: "off" }, true)[0].data.hvac_mode).toBe("off");
  });

  it("Vypnuto s dobou je časovač na 5 °C (1 h, do změny plánu); Trvale a bez Tado CE režim off; Ručně po vypnutí začíná na 21 °C", () => {
    expect(heatingCalls("climate.t", plan, { mode: "off", manualFor: "60" }, true)).toEqual([
      { domain: "tado_ce", service: "set_climate_timer", data: { entity_id: "climate.t", temperature: 5, time_period: "01:00:00" } },
    ]);
    expect(heatingCalls("climate.t", plan, { mode: "off", manualFor: "next" }, true)[0].data).toEqual({ entity_id: "climate.t", temperature: 5, overlay: "next_time_block" });
    expect(heatingCalls("climate.t", plan, { mode: "off", manualFor: "forever" }, true)[0].data.hvac_mode).toBe("off");
    expect(heatingCalls("climate.t", plan, { mode: "off", manualFor: "60" }, false)[0].data.hvac_mode).toBe("off");
    expect(heatingCalls("climate.t", e("heat", { temperature: 5 }), { mode: "manual" }, true)[0].data.temperature).toBe(21);
  });

  it("jen nová teplota je Ručně do změny plánu; doba 1 h je time_period, Trvale overlay manual", () => {
    expect(heatingCalls("climate.t", plan, { temperature: 22.5 }, true)).toEqual([
      { domain: "tado_ce", service: "set_climate_timer", data: { entity_id: "climate.t", temperature: 22.5, overlay: "next_time_block" } },
    ]);
    expect(heatingCalls("climate.t", plan, { mode: "manual", temperature: 21, manualFor: "60" }, true)[0].data).toEqual({ entity_id: "climate.t", temperature: 21, time_period: "01:00:00" });
    expect(heatingCalls("climate.t", plan, { mode: "manual", manualFor: "forever" }, true)[0].data).toEqual({ entity_id: "climate.t", temperature: 20, overlay: "manual" });
  });

  it("Boost je 25 °C, výchozí na 30 min; bez akce Tado CE se Boost nepošle a Ručně je set_temperature", () => {
    expect(heatingCalls("climate.t", plan, { mode: "boost" }, true)[0].data).toEqual({ entity_id: "climate.t", temperature: 25, time_period: "00:30:00" });
    expect(heatingCalls("climate.t", plan, { mode: "manual", manualFor: "30" }, true)[0].data).toEqual({ entity_id: "climate.t", temperature: 20, time_period: "00:30:00" });
    expect(heatingCalls("climate.t", plan, { mode: "boost" }, false)).toEqual([]);
    expect(heatingCalls("climate.t", plan, { temperature: 22 }, false)).toEqual([{ domain: "climate", service: "set_temperature", data: { entity_id: "climate.t", temperature: 22, hvac_mode: "heat" } }]);
  });
});

describe("volání klimatizace", () => {
  it("WindFree je chlazení s předvolbou; Chlazení předvolbu WindFree zruší", () => {
    expect(coolingCalls("climate.k", e("off", ac), { mode: "wind_free" }).map((call) => call.data)).toEqual([
      { entity_id: "climate.k", hvac_mode: "cool" },
      { entity_id: "climate.k", preset_mode: "wind_free" },
    ]);
    expect(coolingCalls("climate.k", e("cool", { ...ac, preset_mode: "wind_free" }), { mode: "cool" }).map((call) => call.data)).toEqual([
      { entity_id: "climate.k", hvac_mode: "cool" },
      { entity_id: "climate.k", preset_mode: "none" },
    ]);
  });

  it("Spánek z vypnuté zapne chlazení; teplota celá; vypnutí teplotu neposílá", () => {
    expect(coolingCalls("climate.k", e("off", ac), { mode: "sleep" }).map((call) => call.service)).toEqual(["set_hvac_mode", "set_preset_mode"]);
    expect(coolingCalls("climate.k", e("cool", ac), { temperature: 22.4 })).toEqual([{ domain: "climate", service: "set_temperature", data: { entity_id: "climate.k", temperature: 22 } }]);
    expect(coolingCalls("climate.k", e("cool", ac), { mode: "off", temperature: 22 }).map((call) => call.service)).toEqual(["set_hvac_mode"]);
    expect(coolingStateAfter(e("off", ac), { mode: "wind_free" })).toBe("cool");
  });

  it("síla větru a směr proudění jen z toho, co entita nabízí", () => {
    const entity = e("cool", { ...ac, fan_modes: ["auto", "low", "high"], swing_modes: ["off", "both"] });
    expect(coolingCalls("climate.k", entity, { fan: "low", swing: "both" }).map((call) => [call.service, call.data])).toEqual([
      ["set_fan_mode", { entity_id: "climate.k", fan_mode: "low" }],
      ["set_swing_mode", { entity_id: "climate.k", swing_mode: "both" }],
    ]);
    expect(coolingCalls("climate.k", entity, { fan: "turbo" })).toEqual([]);
  });

  it("Vypnout za: skript Home Assistantu s čekáním a podmínkou stavu", () => {
    expect(delayedOff("climate.k", 180, "cool")).toEqual({
      type: "execute_script",
      sequence: [
        { delay: { hours: 3, minutes: 0, seconds: 0 } },
        { condition: "state", entity_id: "climate.k", state: "cool" },
        { action: "climate.set_hvac_mode", target: { entity_id: "climate.k" }, data: { hvac_mode: "off" } },
      ],
    });
  });
});
