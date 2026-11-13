import type { HomeAssistant } from "./types";

/**
 * A command on its way (CURRENT_SPEC.md kitu, Ovládací prvky, Odezva): the control that sent it pulses from the
 * press until Home Assistant reports the requested state, the call fails, or the watched entities have not changed
 * for `stallMs` (the device did nothing, or something else stopped it). It is the pulsing preset of Klima for every
 * control of every card (uživatel 13. 11. 2026: „když kliknu na něco tak chci vidět zpětnou vazbu. Ze to bliká že
 * to tam jede. […] Stejně jako na klima kartě. A to ma být obecné pravidlo“).
 */
export interface PendingCommand {
  /** The entities whose change shows the command is being carried out. */
  entities: string[];
  /** True when Home Assistant reports what was asked. */
  done: (hass: HomeAssistant) => boolean;
}

interface Watch extends PendingCommand {
  signature: string;
  timer?: ReturnType<typeof setTimeout>;
}

export class Pending {
  private readonly watches = new Map<string, Watch>();

  /** `changed` is called whenever a control starts or stops pulsing (the card re-renders). */
  constructor(
    private readonly changed: () => void,
    private readonly stallMs = 5000,
  ) {}

  has(key: string): boolean {
    return this.watches.has(key);
  }

  /** The command was sent. A state that is already there pulses not at all. */
  start(key: string, hass: HomeAssistant | undefined, command: PendingCommand): void {
    this.stop(key, false);
    if (hass && command.done(hass)) {
      this.changed();
      return;
    }
    const watch: Watch = { ...command, signature: signatureOf(hass, command.entities) };
    this.watches.set(key, watch);
    this.arm(key, watch);
    this.changed();
  }

  /** The call failed, or the card goes away. */
  stop(key: string, notify = true): void {
    const watch = this.watches.get(key);
    if (!watch) return;
    clearTimeout(watch.timer);
    this.watches.delete(key);
    if (notify) this.changed();
  }

  /** On every update of Home Assistant: arrived ones stop, moving ones get the full stall time again. */
  check(hass: HomeAssistant | undefined): void {
    if (!hass) return;
    for (const [key, watch] of [...this.watches]) {
      if (watch.done(hass)) {
        this.stop(key);
        continue;
      }
      const signature = signatureOf(hass, watch.entities);
      if (signature !== watch.signature) {
        watch.signature = signature;
        this.arm(key, watch);
      }
    }
  }

  clear(): void {
    for (const key of [...this.watches.keys()]) this.stop(key, false);
  }

  private arm(key: string, watch: Watch): void {
    clearTimeout(watch.timer);
    watch.timer = setTimeout(() => this.stop(key), this.stallMs);
  }
}

function signatureOf(hass: HomeAssistant | undefined, entities: string[]): string {
  return entities.map((id) => {
    const entity = hass?.states[id];
    return entity ? `${entity.state}|${JSON.stringify(entity.attributes)}` : "";
  }).join("§");
}
