import { LANGUAGES } from "./types";
import type { LanguageSetting } from "./types";

/*
 * Rules of the card configuration shared by the cards (CURRENT_SPEC.md, Konfigurace): every key
 * is optional and a key without a value (null) means the default; a wrong value stops the card
 * with an error that names the key; an unknown key inside a section is an error. A card keeps its
 * own keys, defaults and ranges and validates with these helpers.
 */

/** A wrong value in the YAML. `withCardName` adds the name of the card. */
export class ConfigError extends Error {}

export function fail(message: string): never {
  throw new ConfigError(message);
}

/** Runs the normalization of a card and prefixes its errors with the card name: "Energie Dashboard: …". */
export function withCardName<T>(card: string, normalize: () => T): T {
  try {
    return normalize();
  } catch (error) {
    if (error instanceof ConfigError) {
      throw new Error(`${card}: ${error.message}`);
    }
    throw error;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A section of the YAML; absent or null is an empty section. */
export function section(value: unknown, where: string): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  if (!isRecord(value)) {
    fail(`"${where}" must be a mapping of keys.`);
  }
  return value;
}

export function checkKeys(value: Record<string, unknown>, allowed: readonly string[], where: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(`${where}: unknown key "${key}" (allowed: ${allowed.join(", ")}).`);
    }
  }
}

/**
 * Home Assistant entity IDs: lower-case domain and object ID of letters, digits and "_".
 * `domain` limits the entity to one domain; `example` is the sample of the error message.
 */
export function entityId(value: unknown, where: string, options: { domain?: string; example?: string } = {}): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(id)) {
    fail(`${where} must be an entity ID such as ${options.example ?? `${options.domain ?? "sensor"}.example`}.`);
  }
  if (options.domain && !id.startsWith(`${options.domain}.`)) {
    fail(`${where} must be a ${options.domain} entity (${options.domain}.…), not ${id}.`);
  }
  return id;
}

/** A text that is not empty; absent or null is undefined. */
export function text(value: unknown, where: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    fail(`${where} must be a non-empty text.`);
  }
  return value.trim();
}

/** A text of the card YAML, or the texts by language: `Vaření` or `{cs: Vaření, en: Cooking}`. */
export type LocalizedText = string | Record<string, string>;

/**
 * A text in the YAML that can be given per language (every `name` and `title` of the cards): a text, or a mapping of the language
 * (cs, en, sv, …) to the text; absent or null is undefined. Resolve it with `pickText`.
 */
export function localizedText(value: unknown, where: string): LocalizedText | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (isRecord(value) && Object.keys(value).length > 0) {
    const entries = Object.entries(value);
    if (entries.every(([language, item]) => /^[a-z]{2}(-[A-Za-z]+)?$/.test(language) && typeof item === "string" && item.trim())) {
      return Object.fromEntries(entries.map(([language, item]) => [language, (item as string).trim()]));
    }
  }
  return fail(`${where} must be a text or a mapping of the language to the text, like {cs: Vaření, en: Cooking}.`);
}

/** The text in the language: the language, its base (cs-CZ → cs), English, the first one given. */
export function pickText(value: LocalizedText | undefined, language: string): string | undefined {
  if (value === undefined || typeof value === "string") {
    return value;
  }
  const lower = language.toLowerCase();
  return value[lower] ?? value[lower.split("-")[0]] ?? value.en ?? Object.values(value)[0];
}

/** Every text a name has, in any language (to match a name against a name in Home Assistant). */
export function allTexts(value: LocalizedText | undefined): string[] {
  return value === undefined ? [] : typeof value === "string" ? [value] : Object.values(value);
}

export const LANGUAGE_SETTINGS: readonly LanguageSetting[] = ["auto", ...LANGUAGES];

/** `language` of the card YAML: `auto` (default, follows Home Assistant), `cs`, `en` or `sv`. */
export function languageSetting(value: unknown): LanguageSetting {
  const language = value ?? "auto";
  if (!LANGUAGE_SETTINGS.includes(language as LanguageSetting)) {
    fail(`language must be one of ${LANGUAGE_SETTINGS.join(", ")}.`);
  }
  return language as LanguageSetting;
}
