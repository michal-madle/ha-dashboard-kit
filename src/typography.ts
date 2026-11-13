import { css, unsafeCSS } from "lit";

/*
 * The one typeface of every card and of the controls of the kit (DASHBOARD_UX_SYSTEM.md, Písmo: „Systémové písmo
 * (-apple-system, "SF Pro", Inter, Roboto), tabulkové číslice“; uživatel 13. 11. 2026: „Sjednoť to všude. V kitu i ve
 * všech dashboardech.“). On the iPhone it is SF Pro; Home Assistant's own font (Roboto) is not inherited.
 */
export const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, Roboto, "Helvetica Neue", sans-serif';

/** The card adds it to its styles: the host and everything in it, the popups included, use the system font. */
export const typographyStyles = css`
  :host {
    font-family: ${unsafeCSS(SYSTEM_FONT)};
    font-feature-settings: "tnum" 1;
    -webkit-font-smoothing: antialiased;
  }
`;
