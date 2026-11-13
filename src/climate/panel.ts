import { LitElement, css, html, nothing } from "lit";
import { html as staticHtml, unsafeStatic } from "lit/static-html.js";
import { property, state } from "lit/decorators.js";
import type { PropertyValues, TemplateResult } from "lit";
import type { I18n } from "../i18n";
import type { EntityId, HomeAssistant } from "../types";
import type { SegmentOption } from "../controls/segmented";
import { fitJoined, joinedStyles, joinedText } from "../joined";
import {
  COOLING_MODES,
  HEATING_MODES,
  commonMode,
  coolingCalls,
  coolingStateAfter,
  delayedOff,
  heatingCalls,
  heatingTimer,
  isOn,
  modeOf,
  numberOf,
  offeredCooling,
  range,
  tapRoom,
  targets,
} from "./logic";
import type { ClimateDraft, ClimateMode, ClimateRoom, ClimateSystem, ManualFor, OffAfter, ServiceCall } from "./logic";

/** Every text of the popup; the card gives them in its language (the kit has no texts of its own). */
export interface ClimateTexts {
  rooms: string;
  temperature: string;
  mode: string;
  modes: Record<ClimateMode, string>;
  unavailable: string;
  /** "Teď 21,6 °C" for one room, "Teď Obývák 23,4 °C · Ložnice 24,1 °C" for more. */
  now: (parts: string) => string;
  heats: string;
  /** "Cíl: Obývák 22° · Ložnice 24°" when the targets differ. */
  targets: (parts: string) => string;
  /** "Různé režimy: Obývák Chlazení · Ložnice WindFree". */
  mixedModes: (parts: string) => string;
  /** "První změna nastaví všechny vybrané stejně." */
  firstChange: string;
  manualFor: string;
  manualForChoices: Record<ManualFor, string>;
  offAfter: string;
  offAfterChoices: Record<string, string>;
  /** Footers: what happens next. */
  untilNextPlan: string;
  untilTime: (time: string) => string;
  untilChanged: string;
  runsUntilOff: string;
  offAt: (time: string) => string;
  /** Spoken while the change waits or is being sent. */
  sending: string;
  failed: string;
}

const MANUAL_FOR: ManualFor[] = ["next", "60", "180", "forever"];
const OFF_AFTER: OffAfter[] = [0, 60, 180, 480];

/**
 * The shared popup Topení / Klimatizace (CURRENT_SPEC.md of the kit): the body of a sheet from the bottom. Room tiles
 * with their state in words (the selected ones only by colour, a room that is off and not selected only an outline; a tap
 * selects every room on, or every room off), the target in big digits with the slider of the kit under it (different
 * targets: a range and no thumb), the modes and how long it holds. A change is sent `delayMs` after the last change, or
 * at once by `flush()` when the sheet closes; while it waits only a small icon shows. Every control acts on one tap: the
 * sheet was opened on purpose. Fires `hdk-sent` after a send, `hdk-error` when Home Assistant refused.
 */
export class HdkClimate extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) i18n?: I18n<unknown>;
  @property({ attribute: false }) texts?: ClimateTexts;
  @property() system: ClimateSystem = "heating";
  @property({ attribute: false }) rooms: ClimateRoom[] = [];
  /** The selected rooms (entity ids); the card sets them when it opens the popup, the popup changes them on a tap. */
  @property({ attribute: false }) selected: EntityId[] = [];
  /** The prefix of the controls of the card (`dd` → `<dd-tile>`, `<dd-slider>`, `<dd-segmented>`). */
  @property() prefix = "hdk";
  @property({ type: Number }) delayMs = 2000;

  @state() private draft: ClimateDraft = {};
  @state() private busy = false;
  @state() private error = "";
  private timer?: number;

  protected updated(): void {
    fitJoined(this.renderRoot, String(Math.round(this.getBoundingClientRect().width)));
  }

  static styles = [joinedStyles, css`
    :host {
      display: block;
    }
    .rooms {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .target {
      position: relative;
      margin: 18px 0 4px;
      text-align: center;
    }
    .big {
      font-size: 64px;
      font-weight: 600;
      line-height: 72px;
      letter-spacing: -1px;
      font-variant-numeric: tabular-nums;
    }
    .big.word {
      font-size: 40px;
      line-height: 72px;
    }
    .sub,
    .note,
    .footer {
      color: var(--hdk-secondary, #98989f);
      font-size: 15px;
      line-height: 20px;
    }
    .sub {
      min-height: 20px;
    }
    .busy {
      position: absolute;
      top: 6px;
      right: 0;
      width: 20px;
      height: 20px;
      color: var(--hdk-secondary, #98989f);
    }
    .busy svg {
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .busy svg {
        animation: none;
      }
    }
    .slider {
      margin: 12px 0 0;
    }
    h3 {
      margin: 20px 4px 8px;
      color: var(--hdk-secondary, #98989f);
      font-size: 13px;
      font-weight: 400;
      line-height: 18px;
      text-transform: uppercase;
    }
    .modes {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .note,
    .footer {
      margin: 8px 4px 0;
      min-height: 20px;
    }
    .error {
      margin: 8px 4px 0;
      color: var(--hdk-error, #ff6961);
      font-size: 15px;
      line-height: 20px;
    }
  `];

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Leaving with a change that waits: send it now rather than lose it.
    void this.flush();
  }

  protected willUpdate(changed: PropertyValues): void {
    // Another set of rooms or system from the card: what waited belongs to the old one and goes now.
    if ((changed.has("system") && changed.get("system") !== undefined) || (changed.has("rooms") && changed.get("rooms") !== undefined)) {
      void this.flush(changed.get("selected") ?? this.selected);
    }
  }

  /** Sends what waits at once (the sheet closes). */
  async flush(selected: EntityId[] = this.selected): Promise<void> {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    const draft = this.draft;
    if (!Object.keys(draft).length) return;
    this.draft = {};
    await this.send(draft, selected);
  }

  private change(next: ClimateDraft): void {
    this.draft = { ...this.draft, ...next };
    this.error = "";
    this.busy = true;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), this.delayMs);
  }

  private async send(draft: ClimateDraft, selected: EntityId[]): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    this.busy = true;
    const timer = heatingTimer(hass);
    try {
      for (const entityId of selected) {
        const entity = hass.states[entityId];
        if (!entity || modeOf(this.system, entity) === undefined) continue;
        const calls: ServiceCall[] = this.system === "heating" ? heatingCalls(entityId, entity, draft, timer) : coolingCalls(entityId, entity, draft);
        for (const call of calls) await hass.callService(call.domain, call.service, call.data);
        const offAfter = draft.offAfter ?? 0;
        const after = this.system === "cooling" ? coolingStateAfter(entity, draft) : undefined;
        if (offAfter > 0 && after !== undefined && after !== "off") await hass.callWS(delayedOff(entityId, offAfter, after));
      }
      this.dispatchEvent(new CustomEvent("hdk-sent", { bubbles: true, composed: true }));
    } catch (error) {
      this.error = `${this.texts?.failed ?? "Failed"}: ${error instanceof Error ? error.message : String(error)}`;
      this.dispatchEvent(new CustomEvent("hdk-error", { detail: { message: this.error }, bubbles: true, composed: true }));
    } finally {
      // A newer change may wait already: its icon stays.
      this.busy = this.timer !== undefined;
    }
  }

  private name(entityId: EntityId): string {
    return this.rooms.find((room) => room.entity === entityId)?.name ?? entityId;
  }

  private degrees(value: number): string {
    const i18n = this.i18n;
    const text = i18n ? (this.system === "heating" ? i18n.half(value) : i18n.whole(value)) : String(value);
    return `${text}°`;
  }

  /** The state of a room in words for its tile ("Chlazení · 22°", "Plán · 21°", "Vypnuto"). */
  private roomText(entityId: EntityId): string {
    const t = this.texts!;
    const entity = this.hass?.states[entityId];
    const mode = modeOf(this.system, entity);
    if (mode === undefined) return t.unavailable;
    const target = numberOf(entity?.attributes.temperature);
    const showTarget = mode !== "off" && mode !== "boost" && mode !== "fan_only" && target !== undefined;
    return showTarget ? `${t.modes[mode]} · ${this.degrees(target)}` : t.modes[mode];
  }

  private selectRoom(entityId: EntityId): void {
    const next = tapRoom(this.system, this.hass, this.rooms, this.selected, entityId);
    if (next.join() === this.selected.join()) return;
    // What waited belongs to the rooms selected so far.
    void this.flush(this.selected);
    this.selected = next;
    this.dispatchEvent(new CustomEvent("hdk-select-rooms", { detail: { selected: next }, bubbles: true, composed: true }));
  }

  render(): TemplateResult | typeof nothing {
    const t = this.texts;
    const i18n = this.i18n;
    if (!t || !i18n) return nothing;
    const hass = this.hass;
    const first = hass?.states[this.selected[0]];
    const { min, max, step } = range(this.system, first);
    const known = targets(hass, this.selected);
    const values = [...new Set(known.map((item) => item.value))];
    const now = commonMode(this.system, hass, this.selected);
    const mode = this.draft.mode ?? now;
    const different = this.draft.temperature === undefined && values.length > 1;
    const value = this.draft.temperature ?? (mode === "boost" ? 25 : values[0]);
    const word = mode === "off" || mode === "fan_only";
    const big = word && mode !== undefined ? t.modes[mode] : different ? `${this.degrees(Math.min(...values)).replace(/°$/, "")}–${this.degrees(Math.max(...values))}` : value !== undefined ? this.degrees(value) : "––";

    // Teď: the current temperature of the rooms; Cíl: the targets when they differ.
    const currents = this.selected.flatMap((id) => {
      const current = numberOf(hass?.states[id]?.attributes.current_temperature);
      return current === undefined ? [] : [{ id, text: `${i18n.one(current)} °C` }];
    });
    const heatsNow = this.system === "heating" && this.selected.length === 1 && hass?.states[this.selected[0]]?.attributes.hvac_action === "heating";
    const sub = different
      ? t.targets(known.map((item) => `${this.name(item.entity)} ${this.degrees(item.value)}`).join(" · "))
      : currents.length
        ? t.now(this.selected.length === 1 ? `${currents[0].text}${heatsNow ? ` · ${t.heats}` : ""}` : currents.map((item) => `${this.name(item.id)} ${item.text}`).join(" · "))
        : "";

    const modes = this.system === "heating" ? HEATING_MODES.filter((item) => item !== "boost" || heatingTimer(hass)) : COOLING_MODES.filter((item) => this.selected.some((id) => offeredCooling(hass?.states[id]).includes(item)));
    const mixedModes = this.draft.mode === undefined && now === undefined && this.selected.length > 1;
    const sliderDisabled = this.system === "cooling" && (mode === "off" || mode === "fan_only");

    return html`
      <div class="rooms" role="group" aria-label=${t.rooms}>
        ${this.rooms.map((room) => {
          const entity = hass?.states[room.entity];
          const on = isOn(this.system, entity);
          const selected = this.selected.includes(room.entity);
          return tile(this.prefix, {
            name: room.name,
            text: this.roomText(room.entity),
            state: selected ? "on" : on ? "idle" : "off",
            disabled: on === undefined,
            pressed: selected,
            onPress: () => this.selectRoom(room.entity),
          });
        })}
      </div>
      <div class="target">
        <div class="big ${word ? "word" : ""}" aria-live="polite">${big}</div>
        <div class="sub">${sub}</div>
        ${this.busy
          ? html`<span class="busy" role="status" aria-label=${t.sending}
              ><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 2.5a7.5 7.5 0 1 1-7.5 7.5"></path></svg
            ></span>`
          : nothing}
      </div>
      <div class="slider">
        ${slider(this.prefix, {
          min,
          max,
          step,
          value: value ?? min,
          mixed: different,
          marks: different ? values : [],
          label: t.temperature,
          valueText: value !== undefined ? this.degrees(value) : "",
          minLabel: this.degrees(min),
          maxLabel: this.degrees(max),
          disabled: sliderDisabled || !this.selected.length,
          onChange: (next: number) =>
            // Moving the temperature of the heating is Ručně (spec: „Posunutí teploty přepne Plán na Ručně“).
            this.change(this.system === "heating" && mode !== "manual" ? { temperature: next, mode: "manual" } : { temperature: next }),
        })}
      </div>
      <h3>${t.mode}</h3>
      ${this.system === "heating"
        ? segmented(this.prefix, {
            label: t.mode,
            options: modes.map((item): SegmentOption => ({ value: item, label: t.modes[item] })),
            value: mode ?? "",
            onSelect: (next: string) => this.change({ mode: next as ClimateMode, ...(next === "plan" || next === "off" ? { temperature: undefined } : {}) }),
          })
        : html`<div class="modes" role="group" aria-label=${t.mode}>
            ${modes.map((item) =>
              tile(this.prefix, {
                centered: true,
                name: t.modes[item],
                state: mode === item ? "on" : "idle",
                pressed: mode === item,
                onPress: () => this.change({ mode: item }),
              }),
            )}
          </div>`}
      ${mixedModes ? html`<div class="note">${joinedText(t.mixedModes(this.selected.map((id) => `${this.name(id)}\u00a0${t.modes[modeOf(this.system, hass?.states[id]) ?? "off"] ?? ""}`).join(" · ")))}</div>` : nothing}
      ${(different || mixedModes) && !Object.keys(this.draft).length ? html`<div class="note">${t.firstChange}</div>` : nothing}
      ${this.system === "heating" ? this.renderManualFor(mode) : this.renderOffAfter(mode)}
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
    `;
  }

  private renderManualFor(mode: ClimateMode | undefined): TemplateResult | typeof nothing {
    const t = this.texts!;
    // Without the timer of Tado CE the duration cannot be sent: no section, as Boost is not offered either.
    if (!heatingTimer(this.hass)) return nothing;
    const usable = mode === "manual" || mode === "boost";
    const value = this.draft.manualFor ?? (mode === "boost" ? "60" : "next");
    const minutes = Number(value);
    const footer = !usable ? "" : value === "next" ? t.untilNextPlan : value === "forever" ? t.untilChanged : t.untilTime(this.i18n!.time(Date.now() + minutes * 60000));
    return html`<h3>${t.manualFor}</h3>
      ${segmented(this.prefix, {
        label: t.manualFor,
        options: MANUAL_FOR.map((item): SegmentOption => ({ value: item, label: t.manualForChoices[item] })),
        value,
        disabled: !usable,
        wrap: true,
        onSelect: (next: string) => this.change({ manualFor: next as ManualFor, ...(this.draft.mode === undefined && mode ? { mode } : {}) }),
      })}
      <div class="footer">${footer}</div>`;
  }

  private renderOffAfter(mode: ClimateMode | undefined): TemplateResult {
    const t = this.texts!;
    const value = this.draft.offAfter ?? 0;
    // Every selected air conditioner runs (also in different modes), or the popup switches it on now.
    const running = mode !== undefined ? mode !== "off" : this.selected.length > 0 && this.selected.every((id) => isOn(this.system, this.hass?.states[id]) === true);
    const footer = !running ? "" : value === 0 ? t.runsUntilOff : t.offAt(this.i18n!.time(Date.now() + value * 60000));
    return html`<h3>${t.offAfter}</h3>
      ${segmented(this.prefix, {
        label: t.offAfter,
        options: OFF_AFTER.map((item): SegmentOption => ({ value: String(item), label: t.offAfterChoices[String(item)] })),
        value: String(value),
        disabled: !running,
        onSelect: (next: string) => this.change({ offAfter: Number(next) as OffAfter }),
      })}
      <div class="footer">${footer}</div>`;
  }
}

/** A tile of the kit under the prefix of the card; one tap calls `onPress`. */
function tile(prefix: string, props: { name: string; text?: string; state: string; disabled?: boolean; label?: string; centered?: boolean; pressed: boolean; onPress: () => void }): TemplateResult {
  const tag = unsafeStatic(`${prefix}-tile`);
  return staticHtml`<${tag}
    kind="action"
    ?centered=${props.centered ?? false}
    .name=${props.name}
    .text=${props.text ?? ""}
    .state=${props.state}
    .disabled=${props.disabled ?? false}
    .label=${props.label ?? ""}
    .pressed=${props.pressed}
    @hdk-press=${(event: Event) => {
      event.stopPropagation();
      props.onPress();
    }}
  ></${tag}>`;
}

/** A segmented control of the kit; a choice calls `onSelect`. */
function segmented(prefix: string, props: { label: string; options: SegmentOption[]; value: string; disabled?: boolean; wrap?: boolean; onSelect: (value: string) => void }): TemplateResult {
  const tag = unsafeStatic(`${prefix}-segmented`);
  return staticHtml`<${tag}
    .label=${props.label}
    .options=${props.options}
    .value=${props.value}
    .disabled=${props.disabled ?? false}
    ?wrap=${props.wrap ?? false}
    @hdk-select=${(event: CustomEvent<{ value: string }>) => {
      event.stopPropagation();
      props.onSelect(event.detail.value);
    }}
  ></${tag}>`;
}

/** The slider of the kit; a set value calls `onChange`. */
function slider(
  prefix: string,
  props: { min: number; max: number; step: number; value: number; mixed: boolean; marks: number[]; label: string; valueText: string; minLabel: string; maxLabel: string; disabled: boolean; onChange: (value: number) => void },
): TemplateResult {
  const tag = unsafeStatic(`${prefix}-slider`);
  return staticHtml`<${tag}
    .min=${props.min}
    .max=${props.max}
    .step=${props.step}
    .tickStep=${1}
    .value=${props.value}
    ?mixed=${props.mixed}
    .marks=${props.marks}
    .label=${props.label}
    .valueText=${props.valueText}
    .minLabel=${props.minLabel}
    .maxLabel=${props.maxLabel}
    .disabled=${props.disabled}
    @hdk-input=${(event: Event) => event.stopPropagation()}
    @hdk-change=${(event: CustomEvent<{ value: number }>) => {
      event.stopPropagation();
      props.onChange(event.detail.value);
    }}
  ></${tag}>`;
}
