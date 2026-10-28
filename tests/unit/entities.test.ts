import { describe, expect, it } from "vitest";
import { isNoValue, readNumber, readText, stringList } from "../../src/entities";
import type { HomeAssistant } from "../../src/types";

// CURRENT_SPEC.md, Entity a data.
const hass = { states: { "sensor.a": { state: "12.5", attributes: {} }, "sensor.b": { state: "unavailable", attributes: {} }, "sensor.c": { state: "text", attributes: {} } } } as unknown as HomeAssistant;

describe("čtení entit", () => {
  it("chybějící, unavailable a unknown stav není hodnota", () => {
    expect(readText(hass, "sensor.a")).toBe("12.5");
    expect(readText(hass, "sensor.b")).toBeUndefined();
    expect(readText(hass, "sensor.nope")).toBeUndefined();
    expect(readText(hass, undefined)).toBeUndefined();
    expect(readText(undefined, "sensor.a")).toBeUndefined();
    expect(isNoValue("unknown")).toBe(true);
    expect(isNoValue("0")).toBe(false);
  });

  it("číslo je jen číslo; jednotky řeší karta", () => {
    expect(readNumber(hass, "sensor.a")).toBe(12.5);
    expect(readNumber(hass, "sensor.b")).toBeUndefined();
    expect(readNumber(hass, "sensor.c")).toBeUndefined();
  });

  it("seznam textů z atributu: cokoli jiného je prázdný", () => {
    expect(stringList(["Heat", 3, "Cool"])).toEqual(["heat", "cool"]);
    expect(stringList("heat")).toEqual([]);
    expect(stringList(undefined)).toEqual([]);
  });
});
