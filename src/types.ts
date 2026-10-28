/*
 * Types shared by the cards: the parts of Home Assistant's `hass` object the cards use, and the
 * language settings (CURRENT_SPEC.md, Jazyky). A card declares its own configuration types.
 */

export type EntityId = string;

export interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
  /** ISO time; changes only when the state or an attribute changes. */
  last_updated?: string;
  last_changed?: string;
}

export interface HomeAssistant {
  states: Record<EntityId, HassEntity>;
  callService(domain: string, service: string, serviceData?: Record<string, unknown>): Promise<unknown>;
  /** Registered actions by domain; used to see whether an integration offers an action. */
  services?: Record<string, Record<string, unknown> | undefined>;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  /** REST call, e.g. GET states/<entity_id> (whose answer includes last_reported). */
  callApi?<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string): Promise<T>;
  /**
   * Theme settings of the frontend. `darkMode` is the dark mode in effect: with the theme set
   * to "Auto" in the user profile it follows the system (iPhone appearance).
   */
  themes?: { darkMode?: boolean };
  /** Language of the frontend (user profile), e.g. "cs", "sv", "en-GB"; `locale.language` is the current one. */
  language?: string;
  /** Profile of the user (Home Assistant): language and the formats of numbers, time and dates. */
  locale?: { language?: string; number_format?: string; time_format?: string; date_format?: string };
}

/** Languages of the cards (CURRENT_SPEC.md, Jazyky); `auto` follows Home Assistant. */
export const LANGUAGES = ["cs", "en", "sv"] as const;
export type Language = (typeof LANGUAGES)[number];
export type LanguageSetting = "auto" | Language;
