import { describe, expect, it } from "vitest";
import { allTexts, checkKeys, entityId, fail, languageSetting, localizedText, pickText, section, text, withCardName } from "../../src/config";

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

  it("text podle jazyka: text, nebo jazyk → text; vybere se jazyk, jeho základ, angličtina, první", () => {
    expect(localizedText(undefined, "title")).toBeUndefined();
    expect(localizedText(null, "title")).toBeUndefined();
    expect(localizedText(" Vaření ", "name")).toBe("Vaření");
    expect(localizedText({ cs: " Vaření ", en: "Cooking" }, "name")).toEqual({ cs: "Vaření", en: "Cooking" });
    expect(() => localizedText("", "name")).toThrow("name must be a text or a mapping of the language to the text");
    expect(() => localizedText({}, "title")).toThrow("title must be a text or a mapping");
    expect(() => localizedText({ cs: 1 }, "title")).toThrow("title must be a text or a mapping");
    expect(() => localizedText({ Czech: "x" }, "title")).toThrow("title must be a text or a mapping");
    expect(() => localizedText(["x"], "title")).toThrow("title must be a text or a mapping");
    const value = { cs: "Vaření", en: "Cooking" };
    expect(pickText(value, "cs")).toBe("Vaření");
    expect(pickText(value, "cs-CZ")).toBe("Vaření");
    expect(pickText(value, "sv")).toBe("Cooking");
    expect(pickText({ cs: "Vaření", sv: "Matlagning" }, "en")).toBe("Vaření");
    expect(pickText("Kuchyň", "sv")).toBe("Kuchyň");
    expect(pickText(undefined, "cs")).toBeUndefined();
    expect(allTexts(value)).toEqual(["Vaření", "Cooking"]);
    expect(allTexts("Pračka")).toEqual(["Pračka"]);
    expect(allTexts(undefined)).toEqual([]);
  });
});
