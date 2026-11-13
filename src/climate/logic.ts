import type { EntityId, HassEntity, HomeAssistant } from "../types";

/*
 * The logic of the shared popup Topení / Klimatizace (CURRENT_SPEC.md of the kit, Popup Topení / Klimatizace): what the
 * selected rooms have now, how a tap on a room tile selects, and what is sent to Home Assistant. No texts, no drawing.
 */

export type ClimateSystem = "heating" | "cooling";
/** Heating: Plán, Ručně, Boost, Vypnuto. */
export type HeatingMode = "plan" | "manual" | "boost" | "off";
/** Air conditioning: the eight tiles of the mode. */
export type CoolingMode = "off" | "cool" | "wind_free" | "heat" | "fan_only" | "dry" | "auto" | "sleep";
export type ClimateMode = HeatingMode | CoolingMode;
/** Heating "Ručně platí": until the next change of the schedule, 30 min, 1 h, 3 h, until changed (uživatel 13. 11. 2026 k Q202: „můžeme přidat 30 min?“). */
export type ManualFor = "next" | "30" | "60" | "180" | "forever";
/** Air conditioning "Vypnout za" in minutes; 0 = do not switch off. */
export type OffAfter = 0 | 60 | 180 | 480;

export interface ClimateRoom {
  name: string;
  entity: EntityId;
}

/** What the person changed in the popup and was not sent yet. */
export interface ClimateDraft {
  mode?: ClimateMode;
  temperature?: number;
  manualFor?: ManualFor;
  offAfter?: OffAfter;
  /** Air conditioning: the `fan_mode` and `swing_mode` of the entity (Síla větru, Směr proudění). */
  fan?: string;
  swing?: string;
}

export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

/** Tado: a manual target of 25 °C is Boost, Boost is sent as 25 °C. */
export const BOOST_TEMPERATURE = 25;
export const COOLING_MODES: CoolingMode[] = ["off", "cool", "wind_free", "heat", "fan_only", "dry", "auto", "sleep"];
export const HEATING_MODES: HeatingMode[] = ["plan", "manual", "boost", "off"];

function noValue(state: string | undefined): boolean {
  return state === undefined || state === "" || state === "unavailable" || state === "unknown";
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function numberOf(value: unknown): number | undefined {
  const number = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : undefined;
}

/** The mode of one room now; undefined when the entity is missing or says nothing usable. */
export function modeOf(system: ClimateSystem, entity: HassEntity | undefined): ClimateMode | undefined {
  const state = entity?.state;
  if (!entity || noValue(state)) return undefined;
  if (system === "heating") {
    if (state === "auto") return "plan";
    if (state === "off") return "off";
    if (state === "heat") return numberOf(entity.attributes.temperature) === BOOST_TEMPERATURE ? "boost" : "manual";
    return undefined;
  }
  const preset = String(entity.attributes.preset_mode ?? "");
  if (state === "off") return "off";
  if (state === "cool" && preset === "wind_free") return "wind_free";
  if (preset === "sleep") return "sleep";
  if (state === "heat_cool") return "auto";
  return COOLING_MODES.includes(state as CoolingMode) ? (state as CoolingMode) : undefined;
}

/** A room is on unless it is off (heating on its schedule is on: it heats when the schedule says so). */
export function isOn(system: ClimateSystem, entity: HassEntity | undefined): boolean | undefined {
  const mode = modeOf(system, entity);
  return mode === undefined ? undefined : mode !== "off";
}

/**
 * A tap on a room tile (uživatel 12. 11. 2026: „když kliknu na vypnutou místnost označí se všechny vypnuté. Když kliknu
 * na zapnutou označí se všechny zapnuté“): a room outside the selection selects every room in the same state (on or off).
 * A tap on a selected room takes it out of the selection, unless it is the only one left.
 */
export function tapRoom(system: ClimateSystem, hass: HomeAssistant | undefined, rooms: ClimateRoom[], selected: EntityId[], tapped: EntityId): EntityId[] {
  if (selected.includes(tapped)) return selected.length > 1 ? selected.filter((id) => id !== tapped) : selected;
  const on = isOn(system, hass?.states[tapped]);
  if (on === undefined) return selected;
  return rooms.filter((room) => isOn(system, hass?.states[room.entity]) === on).map((room) => room.entity);
}

/** Targets of the selected rooms that have one, in their order. */
export function targets(hass: HomeAssistant | undefined, selected: EntityId[]): Array<{ entity: EntityId; value: number }> {
  return selected.flatMap((entity) => {
    const value = numberOf(hass?.states[entity]?.attributes.temperature);
    return value === undefined ? [] : [{ entity, value }];
  });
}

/** The common mode of the selected rooms; undefined when they differ or none is known. */
export function commonMode(system: ClimateSystem, hass: HomeAssistant | undefined, selected: EntityId[]): ClimateMode | undefined {
  const modes = new Set(selected.map((entity) => modeOf(system, hass?.states[entity])).filter((mode) => mode !== undefined));
  return modes.size === 1 ? [...modes][0] : undefined;
}

/** The range of the slider from the first selected entity; heating by halves, air conditioning by whole degrees. */
export function range(system: ClimateSystem, entity: HassEntity | undefined): { min: number; max: number; step: number } {
  const step = system === "heating" ? 0.5 : 1;
  const min = numberOf(entity?.attributes.min_temp) ?? (system === "heating" ? 5 : 16);
  const max = numberOf(entity?.attributes.max_temp) ?? (system === "heating" ? 25 : 30);
  return { min: Math.ceil(min / step) * step, max: Math.floor(max / step) * step, step };
}

/** The cooling modes one entity offers: its `hvac_modes`, WindFree and Spánek only with their preset. */
export function offeredCooling(entity: HassEntity | undefined): CoolingMode[] {
  const hvac = list(entity?.attributes.hvac_modes);
  const presets = list(entity?.attributes.preset_modes);
  return COOLING_MODES.filter((mode) => {
    if (mode === "wind_free") return hvac.includes("cool") && presets.includes("wind_free");
    if (mode === "sleep") return presets.includes("sleep");
    if (mode === "auto") return hvac.includes("auto") || hvac.includes("heat_cool");
    return hvac.includes(mode);
  });
}

/** The choices of an attribute list (`fan_modes`, `swing_modes`) that every selected entity offers, in the order of the first. */
export function sharedChoices(hass: HomeAssistant | undefined, selected: EntityId[], attribute: string): string[] {
  const lists = selected.map((id) => list(hass?.states[id]?.attributes[attribute])).filter((items) => items.length);
  if (!lists.length) return [];
  return lists[0].filter((item) => lists.every((items) => items.includes(item)));
}

/** The common value of an attribute (`fan_mode`, `swing_mode`) of the selected entities; undefined when they differ. */
export function commonAttribute(hass: HomeAssistant | undefined, selected: EntityId[], attribute: string): string | undefined {
  const values = new Set(selected.map((id) => hass?.states[id]?.attributes[attribute]).filter((value): value is string => typeof value === "string"));
  return values.size === 1 ? [...values][0] : undefined;
}

/** Tado CE has its timer action (Boost and the duration of Ručně need it). */
export function heatingTimer(hass: HomeAssistant | undefined): boolean {
  return Boolean(hass?.services?.tado_ce?.set_climate_timer);
}

/** "01:00:00" for the Tado CE `time_period` field. */
export function timePeriod(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
}

/**
 * The calls for one heating room. A draft with only a new temperature is Ručně (spec: „Posunutí teploty přepne Plán
 * na Ručně“). Ručně and Boost use `tado_ce.set_climate_timer` (target and `overlay` next_time_block / manual
 * or `time_period`); without that action Ručně is `climate.set_temperature` and Boost is not sent.
 */
export function heatingCalls(entityId: EntityId, entity: HassEntity | undefined, draft: ClimateDraft, timer: boolean): ServiceCall[] {
  // The popup sets Ručně itself when the temperature moves; a draft with only a temperature is Ručně too.
  const mode = (draft.mode as HeatingMode | undefined) ?? (draft.temperature !== undefined ? "manual" : modeOf("heating", entity));
  if (mode === undefined) return [];
  if (mode === "plan") return [{ domain: "climate", service: "set_hvac_mode", data: { entity_id: entityId, hvac_mode: "auto" } }];
  if (mode === "off") return [{ domain: "climate", service: "set_hvac_mode", data: { entity_id: entityId, hvac_mode: "off" } }];
  const target = mode === "boost" ? BOOST_TEMPERATURE : (draft.temperature ?? numberOf(entity?.attributes.temperature) ?? 21);
  if (!timer) {
    return mode === "manual" ? [{ domain: "climate", service: "set_temperature", data: { entity_id: entityId, temperature: target, hvac_mode: "heat" } }] : [];
  }
  const manualFor = draft.manualFor ?? (mode === "boost" ? "30" : "next");
  const data: Record<string, unknown> = { entity_id: entityId, temperature: target };
  if (manualFor === "next") data.overlay = "next_time_block";
  else if (manualFor === "forever") data.overlay = "manual";
  else data.time_period = timePeriod(Number(manualFor));
  return [{ domain: "tado_ce", service: "set_climate_timer", data }];
}

/** The calls for one air conditioner: the mode (WindFree and Spánek are presets of their mode) and the target. */
export function coolingCalls(entityId: EntityId, entity: HassEntity | undefined, draft: ClimateDraft): ServiceCall[] {
  const calls: ServiceCall[] = [];
  const target = { entity_id: entityId };
  const hvac = list(entity?.attributes.hvac_modes);
  const presets = list(entity?.attributes.preset_modes);
  const preset = String(entity?.attributes.preset_mode ?? "");
  const mode = draft.mode as CoolingMode | undefined;
  if (mode !== undefined) {
    const setMode = (hvac_mode: string) => calls.push({ domain: "climate", service: "set_hvac_mode", data: { ...target, hvac_mode } });
    const setPreset = (preset_mode: string) => calls.push({ domain: "climate", service: "set_preset_mode", data: { ...target, preset_mode } });
    if (mode === "wind_free") {
      setMode("cool");
      setPreset("wind_free");
    } else if (mode === "sleep") {
      if (entity?.state === "off" || noValue(entity?.state)) setMode("cool");
      setPreset("sleep");
    } else {
      setMode(mode === "auto" ? (hvac.includes("auto") ? "auto" : "heat_cool") : mode);
      // Chlazení and the other modes leave a preset of WindFree or Spánek.
      if (mode !== "off" && (preset === "wind_free" || preset === "sleep") && presets.includes("none")) setPreset("none");
    }
  }
  if (draft.temperature !== undefined && mode !== "off") {
    calls.push({ domain: "climate", service: "set_temperature", data: { ...target, temperature: Math.round(draft.temperature) } });
  }
  // Only what the entity offers (`fan_modes`, `swing_modes`).
  if (draft.fan !== undefined && list(entity?.attributes.fan_modes).includes(draft.fan)) calls.push({ domain: "climate", service: "set_fan_mode", data: { ...target, fan_mode: draft.fan } });
  if (draft.swing !== undefined && list(entity?.attributes.swing_modes).includes(draft.swing)) calls.push({ domain: "climate", service: "set_swing_mode", data: { ...target, swing_mode: draft.swing } });
  return calls;
}

/** The state an air conditioner has after the calls (the condition of the switch-off later). */
export function coolingStateAfter(entity: HassEntity | undefined, draft: ClimateDraft): string | undefined {
  const mode = draft.mode as CoolingMode | undefined;
  if (mode === undefined) return entity?.state;
  if (mode === "wind_free" || (mode === "sleep" && (entity?.state === "off" || noValue(entity?.state)))) return "cool";
  if (mode === "sleep") return entity?.state;
  if (mode === "auto") return list(entity?.attributes.hvac_modes).includes("auto") ? "auto" : "heat_cool";
  return mode;
}

/**
 * A script Home Assistant runs by itself after `minutes` (`execute_script`, no script in the configuration): it turns the
 * air conditioner off, but only while it is still in `onlyWhile`, so a change made meanwhile is not overridden.
 */
export function delayedOff(entityId: EntityId, minutes: number, onlyWhile: string | undefined): Record<string, unknown> {
  const seconds = Math.round(minutes * 60);
  const sequence: Array<Record<string, unknown>> = [{ delay: { hours: Math.floor(seconds / 3600), minutes: Math.floor((seconds % 3600) / 60), seconds: seconds % 60 } }];
  if (onlyWhile !== undefined) sequence.push({ condition: "state", entity_id: entityId, state: onlyWhile });
  sequence.push({ action: "climate.set_hvac_mode", target: { entity_id: entityId }, data: { hvac_mode: "off" } });
  return { type: "execute_script", sequence };
}
