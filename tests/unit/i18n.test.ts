import { describe, expect, it } from "vitest";
import { cardLanguage, getI18n, hassLanguage, languageOf } from "../../src/i18n";
import type { Dictionaries } from "../../src/i18n";
import type { HomeAssistant } from "../../src/types";

// CURRENT_SPEC.md, Jazyky.
const TEXTS: Dictionaries<{ hello: string }> = { cs: { hello: "Ahoj" }, en: { hello: "Hello" }, sv: { hello: "Hej" } };
const hass = (locale: HomeAssistant["locale"], language?: string) => ({ states: {}, locale, language }) as unknown as HomeAssistant;

describe("jazyk karty", () => {
  it("čeština a švédština jsou, jak jsou; jakýkoli jiný jazyk i žádný je angličtina", () => {
    expect(languageOf("cs")).toBe("cs");
    expect(languageOf("cs-CZ")).toBe("cs");
    expect(languageOf("sv_SE")).toBe("sv");
    expect(languageOf("de")).toBe("en");
    expect(languageOf("")).toBe("en");
  });

  it("auto sleduje profil Home Assistantu (locale.language před language), cs / en / sv jazyk vynutí", () => {
    expect(hassLanguage(hass({ language: "sv" }, "cs"))).toBe("sv");
    expect(hassLanguage(hass(undefined, "cs"))).toBe("cs");
    expect(hassLanguage(undefined)).toBe("");
    expect(cardLanguage("auto", hass({ language: "sv" }))).toBe("sv");
    expect(cardLanguage("auto", hass({ language: "fr" }))).toBe("en");
    expect(cardLanguage("cs", hass({ language: "sv" }))).toBe("cs");
  });
});

describe("texty a formáty", () => {
  it("vrátí slovník jazyka a drží vyrovnávací paměť pro stejné slovníky", () => {
    const a = getI18n(TEXTS, "sv");
    expect(a.t.hello).toBe("Hej");
    expect(getI18n(TEXTS, "sv")).toBe(a);
    expect(getI18n({ ...TEXTS }, "sv")).not.toBe(a);
  });

  it("čísla: česky a švédsky s čárkou, anglicky s tečkou", () => {
    expect(getI18n(TEXTS, "cs").one(1.25)).toBe("1,3");
    expect(getI18n(TEXTS, "sv").one(21.3)).toBe("21,3");
    expect(getI18n(TEXTS, "en").one(21.3)).toBe("21.3");
    expect(getI18n(TEXTS, "cs").two(1.2)).toBe("1,20");
    expect(getI18n(TEXTS, "en").two(1.234)).toBe("1.23");
    expect(getI18n(TEXTS, "en").half(21.7)).toBe("21.5");
  });

  it("procenta: česky a švédsky s mezerou, anglicky bez", () => {
    expect(getI18n(TEXTS, "cs").percent(65)).toBe("65 %");
    expect(getI18n(TEXTS, "sv").percent(65)).toBe("65 %");
    expect(getI18n(TEXTS, "en").percent(65)).toBe("65%");
  });

  it("profil: pevný formát čísel a 12 / 24 hodinový čas", () => {
    const dot = getI18n(TEXTS, "cs", hass({ language: "cs", number_format: "comma_decimal" }));
    expect(dot.one(2.5)).toBe("2.5");
    const none = getI18n(TEXTS, "en", hass({ language: "en", number_format: "none" }));
    expect(none.whole(1234)).toBe("1234");
    const evening = new Date(2026, 9, 24, 18, 0).getTime();
    expect(getI18n(TEXTS, "en", hass({ language: "en", time_format: "12" })).time(evening)).toMatch(/6:00\s?PM/i);
    expect(getI18n(TEXTS, "en", hass({ language: "en", time_format: "24" })).time(evening)).toBe("18:00");
  });

  it("neznámá značka jazyka profilu se nezřítí, ale vrátí angličtinu", () => {
    expect(getI18n(TEXTS, "en", hass({ language: "xx-invalid-tag" })).one(1.5)).toBe("1.5");
  });
});
