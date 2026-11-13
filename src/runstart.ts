import { entityState } from "./entities";
import type { HomeAssistant } from "./types";

/*
 * Since when an entity has its current state, so that a restart of Home Assistant does not start a duration again
 * (CURRENT_SPEC.md, Entity a data). `last_changed` of Home Assistant begins at the restart for every entity that is
 * restored or reconnects, so a washing machine that has run for half an hour would run "2 min". The recorder keeps the
 * real moment: the history of the entity shows the same state before and after the restart. A gap (unavailable,
 * unknown) is not a change: the run goes on across it, as in the cycles of the Energie card.
 */

/** How far back the history is searched; a run that began earlier is shown from the beginning of this window. */
export const RUN_LOOKBACK_MS = 7 * 24 * 3_600_000;

type RawTime = number | string | null | undefined;

/** One row of `history/history_during_period` with `minimal_response` (`s`, `lu`) or the full form. */
export interface RawHistoryRow {
  s?: string;
  state?: string;
  lu?: RawTime;
  last_updated?: RawTime;
}

function toMillis(value: RawTime): number | undefined {
  if (value === undefined || value === null) return undefined;
  const time = typeof value === "number" ? (value < 1e11 ? value * 1000 : value) : Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

/**
 * The start of the last run of the same state in the rows (ms), and that state. Rows without a state or a time and
 * the gaps `unavailable` / `unknown` are skipped; only a different known state starts a new run.
 */
export function lastRun(rows: RawHistoryRow[] | undefined): { state: string; start: number } | undefined {
  let run: { state: string; start: number } | undefined;
  for (const row of rows ?? []) {
    const state = row.s ?? row.state;
    const time = toMillis(row.lu ?? row.last_updated);
    if (state === undefined || time === undefined || state === "unavailable" || state === "unknown" || state === "") continue;
    if (run === undefined || run.state !== state) run = { state, start: time };
  }
  return run;
}

interface Known {
  key: string;
  /** The start from the history; undefined when the history does not say (the lookup failed or the state moved on). */
  start?: number;
}

/**
 * The start of the current state of entities, restart-proof. `of()` answers at once: the known start, or `last_changed`
 * until the lookup in the recorder returns (then `onChange` asks the card to render again). Lookups of one render are
 * sent as one request, and an entity is asked again only when its state or `last_changed` changes.
 */
export class RunStarts {
  private readonly known = new Map<string, Known>();
  private readonly wanted = new Map<string, string>();
  private hass?: HomeAssistant;
  private scheduled = false;

  constructor(
    private readonly onChange: () => void,
    private readonly now: () => number = Date.now,
  ) {}

  /** The moment (ms) the entity got its current state; undefined when the entity is missing or has no time. */
  of(hass: HomeAssistant | undefined, id: string | undefined): number | undefined {
    const entity = entityState(hass, id);
    if (!hass || !id || !entity) return undefined;
    const changed = toMillis(entity.last_changed);
    const key = `${entity.state}|${entity.last_changed ?? ""}`;
    const known = this.known.get(id);
    if (known?.key === key) return known.start === undefined ? changed : Math.min(known.start, changed ?? known.start);
    this.hass = hass;
    // Only when the state could have been older than its last_changed: always, a restart is not visible in the state.
    if (this.wanted.get(id) !== key) {
      this.wanted.set(id, key);
      this.schedule();
    }
    return changed;
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    void Promise.resolve().then(() => this.flush());
  }

  private async flush(): Promise<void> {
    this.scheduled = false;
    const hass = this.hass;
    const asked = new Map(this.wanted);
    this.wanted.clear();
    if (!hass || !asked.size) return;
    const end = this.now();
    let rows: Record<string, RawHistoryRow[]> | null | undefined;
    try {
      rows = await hass.callWS<Record<string, RawHistoryRow[]> | null>({
        type: "history/history_during_period",
        start_time: new Date(end - RUN_LOOKBACK_MS).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: [...asked.keys()],
        include_start_time_state: true,
        significant_changes_only: false,
        minimal_response: true,
        no_attributes: true,
      });
    } catch {
      rows = undefined;
    }
    for (const [id, key] of asked) {
      // The state moved on while the request ran: the next render asks again.
      if (this.wanted.has(id)) continue;
      const run = lastRun(rows?.[id]);
      const current = entityState(this.hass, id)?.state;
      this.known.set(id, { key, start: run && run.state === current ? run.start : undefined });
    }
    this.onChange();
  }
}
