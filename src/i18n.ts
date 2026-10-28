import type { HomeAssistant, Language, LanguageSetting } from "./types";

/*
 * Translations (CURRENT_SPEC.md, Jazyky). Every text of a card comes from one dictionary per
 * language. The Czech dictionary is the source and its type is the contract: a card declares
 * `type Texts = typeof cs` and passes `{ cs, en, sv }: Dictionaries<Texts>`, so a key missing in
 * the English or Swedish dictionary, or one they have extra, fails the card's build
 * (`tsc --noEmit`). Texts from the YAML are shown as written. This module knows no texts: the
 * card keeps its dictionaries in `src/translations/` and wraps `getI18n` (see README.md).
 */

/** The three dictionaries of a card. */
export type Dictionaries<T> = Record<Language, T>;

export interface I18n<T> {
  language: Language;
  /** Locale of the language of the profile: "cs-CZ", "sv-SE", "en", "en-GB", "de" … */
  locale: string;
  t: T;
  /** One decimal place: "21,3" / "21.3". */
  one(value: number): string;
  /** Rounded to halves: "21,5", "22". */
  half(value: number): string;
  /** Up to one decimal place, not rounded to halves (axis labels). */
  tick(value: number): string;
  /** Whole number: "8", "−2". */
  whole(value: number): string;
  /** A percentage: "46 %" in Czech, Swedish, German …, "46%" in English (the rule of Home Assistant). */
  percent(value: number | string): string;
  /** Clock time in the 12 or 24 h format of the profile: "18:00", "6:00 PM". */
  time(ms: number): string;
  /** Whole hour for the chart axis: "18:00" in 24 h, "6 PM" in 12 h. */
  hour(ms: number): string;
  /** Day and month in the date order of the profile: "24. 10.", "24/10", "10/24". */
  day(ms: number): string;
}

/** The language Home Assistant shows (user profile), e.g. "cs", "sv", "en-GB"; "" when not known. */
export function hassLanguage(hass: HomeAssistant | undefined): string {
  return (hass?.locale?.language || hass?.language || "").trim();
}

/** "cs", "cs-CZ" → Czech; "sv", "sv-SE" → Swedish; any other language → English. */
export function languageOf(tag: string): Language {
  const primary = tag.toLowerCase().split(/[-_]/)[0];
  return primary === "cs" ? "cs" : primary === "sv" ? "sv" : "en";
}

/**
 * Card language: `language: cs | en | sv` in the YAML forces it; `auto` follows the language of
 * Home Assistant – Czech and Swedish as they are, English for every other language.
 */
export function cardLanguage(setting: LanguageSetting, hass: HomeAssistant | undefined): Language {
  return setting === "auto" ? languageOf(hassLanguage(hass)) : setting;
}

/**
 * Language of the page before the card has `hass` (the card picker): Home Assistant sets
 * `<html lang>` to its language; without it the browser language.
 */
export function pageLanguage(): Language {
  return languageOf(document.documentElement.lang || navigator.language || "");
}

const caches = new WeakMap<object, Map<string, I18n<unknown>>>();

const DEFAULT_LOCALE: Record<Language, string> = { cs: "cs-CZ", sv: "sv-SE", en: "en" };

/** Where Home Assistant writes a space before "%" (src/common/translations/blank_before_percent.ts). */
const BLANK_BEFORE_PERCENT = new Set(["cs", "de", "fi", "fr", "sk", "sv"]);

/** Locales of the fixed number formats of the profile (src/common/number/format_number.ts). */
const NUMBER_LOCALES: Record<string, string[]> = {
  comma_decimal: ["en-US", "en"],
  decimal_comma: ["de", "es", "it"],
  space_comma: ["fr", "sv", "cs"],
  quote_decimal: ["de-CH"],
};

/** The formats of the user profile of Home Assistant (Profile → General); anything else is "language". */
function profileFormat(hass: HomeAssistant | undefined, key: "number_format" | "time_format" | "date_format"): string {
  const value = hass?.locale?.[key];
  return typeof value === "string" && value !== "" ? value : "language";
}

/**
 * Texts of the card language and the formats of the profile: numbers (language, system, fixed
 * formats, none), time (12 or 24 h) and the order of day and month. By default the formats follow
 * the language of Home Assistant, as its own cards do; Czech and Swedish keep "cs-CZ" and "sv-SE"
 * when a language is forced in the YAML, English keeps a variant such as "en-GB".
 */
export function getI18n<T>(texts: Dictionaries<T>, language: Language, hass?: HomeAssistant): I18n<T> {
  const tag = hassLanguage(hass).replace("_", "-");
  const locale = tag !== "" && languageOf(tag) === language ? tag : DEFAULT_LOCALE[language];
  const numbers = profileFormat(hass, "number_format");
  const time = profileFormat(hass, "time_format");
  const date = profileFormat(hass, "date_format");
  const key = [language, locale, numbers, time, date].join("|");
  let cache = caches.get(texts);
  if (!cache) {
    cache = new Map();
    caches.set(texts, cache);
  }
  let i18n = cache.get(key) as I18n<T> | undefined;
  if (!i18n) {
    i18n = createI18n(texts[language], language, locale, numbers, time, date);
    cache.set(key, i18n);
  }
  return i18n;
}

/** The language tag as the browser knows it, otherwise plain English. */
function knownLocale(tag: string): string {
  try {
    new Intl.NumberFormat(tag);
    return tag;
  } catch {
    return "en";
  }
}

/** 12 h clock: forced by the profile, else what the language (or the system) writes (use_am_pm.ts). */
function usesAmPm(timeFormat: string, locale: string): boolean {
  if (timeFormat === "12") {
    return true;
  }
  if (timeFormat === "24") {
    return false;
  }
  const testLanguage = timeFormat === "system" ? undefined : locale;
  return new Date("January 1, 2023 22:00:00").toLocaleString(testLanguage).includes("10");
}

function createI18n<T>(t: T, language: Language, requested: string, numberFormat: string, timeFormat: string, dateFormat: string): I18n<T> {
  const locale = knownLocale(requested);
  const numberLocale =
    numberFormat === "system"
      ? undefined
      : numberFormat === "none"
        ? "en-US"
        : (NUMBER_LOCALES[numberFormat] ?? locale);
  const grouping = numberFormat === "none" ? { useGrouping: false } : {};
  const one = new Intl.NumberFormat(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1, ...grouping });
  const upToOne = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1, ...grouping });
  const whole = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0, ...grouping });

  const amPm = usesAmPm(timeFormat, locale);
  const hourCycle = amPm ? "h12" : "h23";
  const clock = new Intl.DateTimeFormat(locale, { hour: amPm ? "numeric" : "2-digit", minute: "2-digit", hourCycle });
  const wholeHour = new Intl.DateTimeFormat(locale, amPm ? { hour: "numeric", hourCycle } : { hour: "2-digit", minute: "2-digit", hourCycle });

  // Day and month; "DMY", "MDY" and "YMD" set the order, "language" and "system" leave it to the locale.
  const dayLocale = dateFormat === "system" ? undefined : locale;
  const dayFormat = new Intl.DateTimeFormat(dayLocale, { day: "numeric", month: "numeric" });
  const day = (ms: number): string => {
    if (!["DMY", "MDY", "YMD"].includes(dateFormat)) {
      return dayFormat.format(ms);
    }
    const parts = dayFormat.formatToParts(ms);
    const separator = parts.find((part) => part.type === "literal")?.value ?? "/";
    const last = parts[parts.length - 1];
    const closing = last?.type === "literal" ? last.value : "";
    const dayText = parts.find((part) => part.type === "day")?.value ?? "";
    const monthText = parts.find((part) => part.type === "month")?.value ?? "";
    return dateFormat === "DMY"
      ? `${dayText}${separator}${monthText}${closing}`
      : `${monthText}${separator}${dayText}${closing}`;
  };

  const blank = BLANK_BEFORE_PERCENT.has(locale.toLowerCase().split("-")[0]) ? " " : "";
  return {
    language,
    locale,
    t,
    one: (value) => one.format(value),
    half: (value) => upToOne.format(Math.round(value * 2) / 2),
    tick: (value) => upToOne.format(value),
    whole: (value) => whole.format(value),
    percent: (value) => `${value}${blank}%`,
    time: (ms) => clock.format(ms),
    hour: (ms) => wholeHour.format(ms),
    day,
  };
}
