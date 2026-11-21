import type { HomeAssistant } from "./types";

/*
 * The recorder of Home Assistant (CURRENT_SPEC.md kitu, Entity a data, Historie): one place that asks
 * `history/history_during_period` and reads its rows, for every card. The websocket answers in the compressed form
 * (`s` state, `a` attributes, `lu` last updated, `lc` last changed, times in seconds); the full form (`state`,
 * `last_updated` …) is read too. The state at the beginning of the window is always included, so a chart starts
 * with the state that held then.
 */

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

export type RawTime = number | string | null | undefined;

/** One row of `history/history_during_period`, compressed (`minimal_response`) or full. */
export interface RawHistoryRow {
  s?: string;
  state?: string;
  a?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  lu?: RawTime;
  lc?: RawTime;
  last_updated?: RawTime;
  last_changed?: RawTime;
}

export type RawHistory = Record<string, RawHistoryRow[]>;

/** One state of an entity at a moment (ms). `attributes` only when asked for. */
export interface HistoryPoint {
  time: number;
  state: string;
  attributes?: Record<string, unknown>;
}

export type HistoryMap = Record<string, HistoryPoint[]>;

export interface HistoryOptions {
  /** With the attributes of every row (positions of blinds …); without them the answer is much smaller. */
  attributes?: boolean;
}

/** A time of the recorder in ms: seconds (the compressed form), ms or an ISO text; undefined when not a time. */
export function toMillis(value: RawTime): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return value < 1e11 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** The rows as the recorder sends them, per entity. Throws when the request fails (the card says so). */
export async function historyRows(
  hass: HomeAssistant,
  entityIds: string[],
  startMs: number,
  endMs: number,
  options: HistoryOptions = {},
): Promise<RawHistory> {
  if (entityIds.length === 0) return {};
  const attributes = options.attributes === true;
  const answer = await hass.callWS<RawHistory | null>({
    type: "history/history_during_period",
    start_time: new Date(startMs).toISOString(),
    end_time: new Date(endMs).toISOString(),
    entity_ids: entityIds,
    include_start_time_state: true,
    significant_changes_only: false,
    // With attributes every row has them; the minimal response would leave them out of the rows in between.
    minimal_response: !attributes,
    no_attributes: !attributes,
  });
  return answer ?? {};
}

/**
 * Points in time order per entity. A point earlier than `startMs` (the state at the beginning) is moved to `startMs`;
 * the first row without a time is the state at the beginning. A row without attributes repeats the last ones.
 */
export function parseHistory(raw: RawHistory | null | undefined, startMs: number): HistoryMap {
  const result: HistoryMap = {};
  for (const [entityId, rows] of Object.entries(raw ?? {})) {
    if (!Array.isArray(rows)) continue;
    const points: HistoryPoint[] = [];
    let attributes: Record<string, unknown> | undefined;
    rows.forEach((row, index) => {
      const state = row.s ?? row.state;
      const time = toMillis(row.lu ?? row.last_updated ?? row.lc ?? row.last_changed) ?? (index === 0 ? startMs : undefined);
      attributes = row.a ?? row.attributes ?? attributes;
      if (state === undefined || time === undefined) return;
      points.push(attributes === undefined ? { time: Math.max(time, startMs), state } : { time: Math.max(time, startMs), state, attributes });
    });
    points.sort((left, right) => left.time - right.time);
    result[entityId] = points;
  }
  return result;
}

/** The history of the entities between two moments (ms). Throws when the request fails. */
export async function fetchHistory(
  hass: HomeAssistant,
  entityIds: string[],
  startMs: number,
  endMs: number,
  options: HistoryOptions = {},
): Promise<HistoryMap> {
  return parseHistory(await historyRows(hass, entityIds, startMs, endMs, options), startMs);
}

/** The state that held at `time`: the last point not later than it. */
export function stateAt(points: HistoryPoint[] | undefined, time: number): string | undefined {
  let found: string | undefined;
  for (const point of points ?? []) {
    if (point.time > time) break;
    found = point.state;
  }
  return found;
}
