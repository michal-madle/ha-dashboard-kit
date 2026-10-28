# ha-dashboard-kit

Společné stavební kameny Lovelace karet pro Home Assistant, které dělám: [ha-klima-dashboard](https://github.com/michal-madle/ha-klima-dashboard) (místnosti) a [ha-energie-dashboard](https://github.com/michal-madle/ha-energie-dashboard) (energie domu). Kit není karta: nic se z něj neinstaluje přes HACS a nemá build. Dodává TypeScript zdroje, které si karta zabalí do svého souboru.

**Kam co patří:** společný kód, společná pravidla a společná testovací a build infrastruktura se zakládají tady, ne v kartě. Kartě zůstává to, co zná její entity, texty a vzhled. Přesná pravidla a mapa modulů jsou v [CURRENT_SPEC.md](./CURRENT_SPEC.md) (oddíl Kam co patří).

## Co kit obsahuje

| Import | Co |
|---|---|
| `ha-dashboard-kit/types` | `HomeAssistant`, `HassEntity`, `EntityId`, `Language`, `LanguageSetting` |
| `ha-dashboard-kit/i18n` | jazyk karty z profilu Home Assistantu (cs, sv, jinak en), `getI18n`, formáty čísel, procent, času a dne |
| `ha-dashboard-kit/entities` | `entityState`, `readText`, `readNumber`, `isNoValue`, `stringList` |
| `ha-dashboard-kit/config` | pravidla konfigurace: `fail`, `withCardName`, `section`, `checkKeys`, `entityId`, `text`, `languageSetting` |
| `ha-dashboard-kit/gesture` | `HoldOrDoubleTap`: podržení nebo dvojklep (chráněné ovládání) |
| `ha-dashboard-kit/controls` | `defineControls(předpona)`: přepínač, segmentový ovladač, posuvník podle Apple HIG |
| `ha-dashboard-kit/tsconfig.base.json` | společné nastavení TypeScriptu |
| `ha-dashboard-kit/build/vite.mjs`, `build/copy-build.mjs` | sestavení karty do jednoho souboru a jeho zkopírování do kořene pro HACS |
| `ha-dashboard-kit/testing/*.mjs` | server testů, konfigurace Playwrightu, `makeTest` (pokrytí kódu), `runCoverage`, `axeViolations` |

## Použití v kartě

```jsonc
// package.json karty
"dependencies": {
  "ha-dashboard-kit": "git+https://github.com/michal-madle/ha-dashboard-kit.git#<commit>",
  "lit": "^3.3.1"
}
```

```jsonc
// tsconfig.json karty
{ "extends": "ha-dashboard-kit/tsconfig.base.json", "include": ["src/**/*.ts", "tests/**/*.ts", "vite.config.ts"] }
```

```ts
// vite.config.ts karty
import { defineConfig } from "vite";
import { cardBuild } from "ha-dashboard-kit/build/vite.mjs";

export default defineConfig(cardBuild("ha-energie-dashboard"));
```

```ts
// src/i18n.ts karty: slovníky zůstávají v kartě, kit dodává jen jazyk a formáty
import { cardLanguage, getI18n as kitGetI18n, pageLanguage } from "ha-dashboard-kit/i18n";
import type { Dictionaries, I18n as KitI18n } from "ha-dashboard-kit/i18n";
import { cs } from "./translations/cs";
import { en } from "./translations/en";
import { sv } from "./translations/sv";

export type Texts = typeof cs;
export type I18n = KitI18n<Texts>;
const TEXTS: Dictionaries<Texts> = { cs, en, sv };
export const getI18n = (language: Language, hass?: HomeAssistant): I18n => kitGetI18n(TEXTS, language, hass);
```

```ts
// src/index.ts karty: prvky s předponou karty
import { defineControls } from "ha-dashboard-kit/controls";
defineControls("ed"); // <ed-switch>, <ed-segmented>, <ed-slider>
```

Barvy prvků karta namapuje na `--hdk-*` (seznam v [CURRENT_SPEC.md](./CURRENT_SPEC.md), oddíl Ovládací prvky); události prvků jsou `hdk-toggle`, `hdk-select`, `hdk-input`, `hdk-change`.

Testy karty: `tests/server.mjs` volá `startServer`, `playwright.config.ts` volá `cardPlaywrightConfig`, `tests/fixtures.ts` volá `makeTest`, `tests/coverage.mjs` volá `runCoverage` (příklady v hlavičkách souborů ve složce `testing/`).

## Jak se kit mění

1. Změna v kitu, test, úprava [CURRENT_SPEC.md](./CURRENT_SPEC.md) a tohoto README (společné pravidlo patří sem, ne do karty).
2. `npm test` (typy, jednotkové testy, testy ovládacích prvků v prohlížeči).
3. Commit a push na `main`.
4. V každé kartě `npm install git+https://github.com/michal-madle/ha-dashboard-kit.git#<commit>`, kontrola `resolved` v `package-lock.json` (`git+https`), `npm test`, commit. Zpětně nekompatibilní změna zvyšuje MAJOR a obě karty se přepíšou v témže kole.

Kit se nikdy neupravuje v `node_modules` karty.

## Vývoj kitu

```bash
npm install
npm test          # tsc --noEmit, vitest, Playwright (tests/harness.html přes Vite)
npm run check     # jen typy
```

Další práce a kandidáti na přesun z karet do kitu jsou v [TODO.md](./TODO.md).
