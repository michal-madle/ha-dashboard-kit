import type { HassEntity, HomeAssistant } from "./types";

/*
 * Reading entities defensively (CURRENT_SPEC.md, Entity a data). The states and attributes of
 * Home Assistant are runtime data: nothing here guesses a unit, a sign or a default.
 */

/** An entity state that carries no value: missing data, not an alarm. */
const NO_VALUE = new Set(["unavailable", "unknown", ""]);

export function isNoValue(state: string): boolean {
  return NO_VALUE.has(state);
}

export function entityState(hass: HomeAssistant | undefined, id: string | undefined): HassEntity | undefined {
  return id ? hass?.states?.[id] : undefined;
}

/** The text state of an entity, or undefined when it is missing, unavailable or unknown. */
export function readText(hass: HomeAssistant | undefined, id: string | undefined): string | undefined {
  const state = entityState(hass, id)?.state;
  return state === undefined || isNoValue(state) ? undefined : state;
}

/**
 * The number in the state of an entity as it stands, or undefined when the entity is missing,
 * unavailable, unknown or not numeric. Units are the card's business (it knows which are valid).
 */
export function readNumber(hass: HomeAssistant | undefined, id: string | undefined): number | undefined {
  const text = readText(hass, id);
  if (text === undefined) {
    return undefined;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** An attribute that should be a list of strings (hvac_modes, preset_modes); anything else is empty. */
export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase())
    : [];
}
