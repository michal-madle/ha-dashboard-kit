import { describe, expect, it } from "vitest";
import { checkKeys, entityId, fail, languageSetting, section, text, withCardName } from "../../src/config";

// CURRENT_SPEC.md, Konfigurace.
describe("pravidla konfigurace", () => {
  it("klíč bez hodnoty (null) je výchozí, sekce může chybět", () => {
    expect(section(undefined, "pv")).toEqual({});
    expect(section(null, "pv")).toEqual({});
    expect(entityId(null, "pv.power")).toBeUndefined();
    expect(text(undefined, "title")).toBeUndefined();
  });

  it("chyba jmenuje klíč a karta přidá svůj název", () => {
    expect(() => section("x", "pv")).toThrow('"pv" must be a mapping of keys.');
    expect(() => checkKeys({ powr: 1 }, ["power"], "pv")).toThrow('pv: unknown key "powr" (allowed: power).');
    expect(() => withCardName("Energie Dashboard", () => fail("pv.power is wrong"))).toThrow("Energie Dashboard: pv.power is wrong");
  });

  it("cizí chyby withCardName nemění", () => {
    expect(() =>
      withCardName("Karta", () => {
        throw new TypeError("jiná chyba");
      }),
    ).toThrow("jiná chyba");
  });

  it("entita: ID, doména a vzorek v chybě", () => {
    expect(entityId(" sensor.a_b ", "x")).toBe("sensor.a_b");
    expect(() => entityId("Sensor Auto", "daily.car")).toThrow("daily.car must be an entity ID such as sensor.example.");
    expect(() => entityId("nic", "x", { example: "sensor.loznice_teplota" })).toThrow("such as sensor.loznice_teplota.");
    expect(() => entityId("sensor.wallbox_boost", "wallbox.boost", { domain: "switch" })).toThrow(
      "wallbox.boost must be a switch entity (switch.…), not sensor.wallbox_boost.",
    );
  });

  it("text nesmí být prázdný", () => {
    expect(text("  Doma ", "title")).toBe("Doma");
    expect(() => text("  ", "title")).toThrow("title must be a non-empty text.");
    expect(() => text(5, "title")).toThrow("title must be a non-empty text.");
  });

  it("language: auto, cs, en, sv; jinak chyba", () => {
    expect(languageSetting(undefined)).toBe("auto");
    expect(languageSetting(null)).toBe("auto");
    expect(languageSetting("sv")).toBe("sv");
    expect(() => languageSetting("de")).toThrow("language must be one of auto, cs, en, sv.");
  });
});
