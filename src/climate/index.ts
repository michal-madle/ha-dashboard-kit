import { HdkClimate } from "./panel";

export { HdkClimate };
export type { ClimateTexts } from "./panel";
export * from "./logic";

/**
 * Registers the popup Topení / Klimatizace under the prefix of the card: `defineClimate("dd")` defines `<dd-climate>`.
 * It draws the tile, the slider and the segmented control of the same prefix, so `defineControls(prefix)` comes first.
 */
export function defineClimate(prefix: string): void {
  if (!customElements.get(`${prefix}-climate`)) {
    const element = class extends HdkClimate {
      constructor() {
        super();
        this.prefix = prefix;
      }
    };
    customElements.define(`${prefix}-climate`, element);
  }
}
