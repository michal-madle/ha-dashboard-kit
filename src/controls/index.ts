import { HdkRing } from "./ring";
import { HdkSegmented } from "./segmented";
import { HdkSheet } from "./sheet";
import { HdkSlider } from "./slider";
import { HdkSwitch } from "./switch";
import { HdkTile } from "./tile";

export { HdkRing, HdkSegmented, HdkSheet, HdkSlider, HdkSwitch, HdkTile };
export type { TileKind, TileState } from "./tile";
export type { SegmentOption } from "./segmented";
export { HintState, hintStyles } from "./hint";

/**
 * Registers the controls under the prefix of the card: `defineControls("ed")` defines
 * `<ed-switch>`, `<ed-segmented>`, `<ed-slider>`, `<ed-ring>`, `<ed-tile>` and `<ed-sheet>`. The prefix is the card's, so two cards on
 * one page never share an element (and never a version of it). Idempotent.
 */
export function defineControls(prefix: string): void {
  const controls: Array<[string, CustomElementConstructor]> = [
    [`${prefix}-switch`, HdkSwitch],
    [`${prefix}-segmented`, HdkSegmented],
    [`${prefix}-slider`, HdkSlider],
    [`${prefix}-ring`, HdkRing],
    [`${prefix}-tile`, HdkTile],
    [`${prefix}-sheet`, HdkSheet],
  ];
  for (const [name, constructor] of controls) {
    if (!customElements.get(name)) {
      customElements.define(name, constructor);
    }
  }
}
