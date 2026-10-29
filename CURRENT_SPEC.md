# CURRENT_SPEC – ha-dashboard-kit (společné stavební kameny karet)

Zdroj pravdy kitu. Obsahuje jen rozhodnutí uživatele a pravidla, která z nich plynou; neplatné se maže (historie se nevede). Pravidla jednotlivých karet jsou ve `CURRENT_SPEC.md` karty (`ha-klima-dashboard`, `ha-energie-dashboard`); kdykoli se oba dokumenty rozcházejí v tom, co patří kitu, platí tento.

## Cíl

- Uživatel 28. 10.: „Budu potřebovat aby ty 2 dashboardy byly udělané stejně. Jako vzor vem klima Dashboard“ a „Konsoliduj obě stávající repa energie a klima. Společný kód redaktoruj a extrahuj do toho nového repa“ a „aby příště se vědělo kam společně prvky zakládat a používat a hledat“.
- Kit je jediné místo pro kód a pravidla, která mají obě karty (a každá další) společná. Karta je tenká: její entity, zadání, texty, vzhled a rozložení. Kit neobsahuje žádný text pro uživatele, žádnou entitu, žádné jméno karty ani žádnou barvu karty.
- Kit není karta: nic se z něj neinstaluje přes HACS a nemá build. Dodává TypeScript zdroje, které si karta zabalí do svého souboru.

## Kam co patří

Rozhodnutí, kam nový kód nebo pravidlo patří:

1. **Do kitu** patří to, co je (nebo hned bude) ve dvou kartách stejné a nezávisí na entitách ani zadání karty: čtení a kontrola hodnot, pravidla konfigurace, jazyky a formáty, gesta, ovládací prvky, testovací a build infrastruktura, společná pravidla chování.
2. **Do karty** patří všechno, co zná její entity, texty, barvy, rozložení nebo model dat (toky energie, místnosti, žaluzie, topení …).
3. Změna ve dvou kartách naráz je znamení, že kód patří do kitu. Třetí kopie se nepíše: nejdřív se kód přesune do kitu.
4. Co do kitu patří, ale ještě v něm není (kandidáti), je v `TODO.md` kitu. Nová věc se do karty nekopíruje „zatím“.

### Mapa modulů

| Import | Soubor | Co |
|---|---|---|
| `ha-dashboard-kit/types` | `src/types.ts` | `HomeAssistant`, `HassEntity`, `EntityId`, `Language`, `LanguageSetting`, `LANGUAGES` |
| `ha-dashboard-kit/i18n` | `src/i18n.ts` | jazyk karty z profilu Home Assistantu, `getI18n(slovníky, jazyk, hass)`, formáty čísel / procent / času / dne, `Dictionaries<T>`, `I18n<T>` |
| `ha-dashboard-kit/entities` | `src/entities.ts` | `entityState`, `readText`, `readNumber`, `isNoValue`, `stringList` |
| `ha-dashboard-kit/config` | `src/config.ts` | pravidla konfigurace: `fail`, `withCardName`, `section`, `checkKeys`, `entityId`, `text`, `languageSetting`, `LANGUAGE_SETTINGS` |
| `ha-dashboard-kit/gesture` | `src/gesture.ts` | `HoldOrDoubleTap`: podržení nebo dvojklep (chráněné ovládání) |
| `ha-dashboard-kit/controls` | `src/controls/` | `defineControls(prefix)`, `HdkSwitch`, `HdkSegmented`, `HdkSlider`, `HintState`, `hintStyles` |
| `ha-dashboard-kit/tsconfig.base.json` | `tsconfig.base.json` | společné nastavení TypeScriptu karet |
| `ha-dashboard-kit/build/vite.mjs` | `build/vite.mjs` | `cardBuild(název)`: Vite pro jeden ES modul `dist/<název>.js` |
| `ha-dashboard-kit/build/copy-build.mjs` | `build/copy-build.mjs` | zkopíruje `dist/<název>.js` do kořene repa pro HACS |
| `ha-dashboard-kit/testing/*.mjs` | `testing/` | `server` (statický server testů), `playwright` (konfigurace), `fixtures` (`makeTest`, pokrytí kódu), `coverage` (`runCoverage`), `helpers` (`axeViolations`) |

Testovací stránka (`tests/harness.html`), scénáře a test samotné karty zůstávají v kartě: znají její entity a vzhled.

## Použití v kartě

- Závislost: `"ha-dashboard-kit": "git+https://github.com/michal-madle/ha-dashboard-kit.git#<commit>"` v `package.json` karty. Vždy konkrétní commit (nebo značka `vX.Y.Z`, až ji uživatel na GitHubu vytvoří; relace Claude značky pushnout nemůže), nikdy větev: build karty musí být opakovatelný. Adresa je `git+https`, ne `github:` (zápis do `package-lock.json` je pak `https`, ne `ssh`; po `npm install` zkontrolovat, že `resolved` je `git+https://…`).
- `tsconfig.json` karty: `"extends": "ha-dashboard-kit/tsconfig.base.json"` a vlastní `include`.
- `vite.config.ts` karty: `import { cardBuild } from "ha-dashboard-kit/build/vite.mjs"`, `export default defineConfig(cardBuild("ha-<karta>-dashboard"))`.
- Karta si své texty drží v `src/translations/` a obalí `getI18n` tak, aby zbytek karty nemusel znát slovníky (`src/i18n.ts` karty: `type Texts = typeof cs`, `const TEXTS: Dictionaries<Texts> = { cs, en, sv }`).
- Ovládací prvky se registrují s předponou karty: `defineControls("ed")` (Energie), `defineControls("kd")` (Klima). Dvě karty na jedné stránce tak nesdílejí prvek ani jeho verzi.
- Kit se v kartě neupravuje (ani v `node_modules`). Chyba nebo nová vlastnost se řeší v kitu: změna, test, commit, aktualizace obou karet (oddíl Verze).
- Technická pravidla, na která se narazilo: (1) Vite v kartě nečte `tsconfig.json` pro TypeScript v `node_modules`, proto `cardBuild` předává esbuildu `experimentalDecorators`; bez toho se `@property` v ovládacích prvcích přeloží špatně a karta se nevykreslí. (2) Playwright nepřekládá `node_modules`: specifikace v kartě nesmí importovat zdroje karty, které používají TypeScript z kitu (testy čtou jen čistá data jako slovníky a schéma konfigurace); testovací pomocníky kitu jsou proto prosté `.mjs` s ručními `.d.mts`. (3) `npm` bere z gitové závislosti jen soubory z `files` v `package.json` kitu; nový adresář, který karta potřebuje, se musí do `files` přidat.

## Jazyky

Společná pravidla pro všechny karty (uživatel 25. 10. u Klima a 28. 10. u Energie: čeština, angličtina, švédština, „podle jazyka Home Assistantu, pokud nebude CZ/SE, tak EN“; „přidávej vždy“):

- Karta mluví česky, anglicky a švédsky. Jazyk karty je jazyk profilu Home Assistantu (`hass.locale.language`, jinak `hass.language`): čeština → česky, švédština → švédsky, jakýkoli jiný jazyk i žádný → anglicky. Změna jazyka v profilu se projeví hned. Klíč `language` (`auto`, `cs`, `en`, `sv`; výchozí `auto`) jazyk vynutí. Hostitelský prvek karty má atribut `lang` jazyka karty.
- Přeloženo je všechno, co karta sama píše nebo říká čtečce obrazovky. Nepřekládají se texty z konfigurace (nadpis, názvy z YAML); bez nich platí výchozí v jazyce karty.
- Zdrojem je čeština (`src/translations/cs.ts` karty), angličtina a švédština mají přesně stejné klíče (typ `Texts = typeof cs` a `Dictionaries<Texts>` kontroluje překlad při sestavení). **Každá změna, která přidá nebo upraví text karty, upraví v téže změně všechny tři jazyky.** Testy karty hlídají, že v angličtině ani ve švédštině nezůstal český text a že se delší texty vejdou od šířky 320 px.
- Čísla, čas a data podle profilu Home Assistantu (`hass.locale`): formát čísel `language`, `system`, `comma_decimal`, `decimal_comma`, `space_comma`, `quote_decimal`, `none`; čas `language`, `system`, `12`, `24`; datum `language`, `system`, `DMY`, `MDY`, `YMD`. Bez profilu platí jazyk karty: česky a švédsky „21,3“ a „46 %“, anglicky „21.3“ a „46%“ (mezeru před % určuje jazyk, jak ji píše Home Assistant). Číslo s jedním (`one`) nebo dvěma (`two`) desetinnými místy, celé (`whole`), po půlích (`half`) a pro osy (`tick`).
- Slovník karty nikdy nepatří do kitu. Do kitu patří jen jazyk, formáty a typy.

## Chráněné ovládání

Společné pravidlo pro prvky, které dělají něco fyzického (žaluzie, mísení vody, zapnutí boostu), uživatel 28. 10.:

- Chráněný prvek se nepřepne jedním klepnutím. Přepne se podržením (`hold_ms`, výchozí 550 ms), druhým klepnutím do `double_tap_ms` (výchozí 400 ms) a segmentový ovladač také tažením palce. Jedno klepnutí jen ukáže nápovědu, jak prvek přepnout (`hint_seconds`, výchozí 3 s). Klávesnice a čtečka obrazovky (klik bez ukazatele, `detail` 0) přepnou hned. Nastavení (posuvníky, režimy bez fyzického účinku) potvrzení nemá.
- **Absolutní pravidlo (uživatel 28. 10.): „nikdy, nikde nemůžeš posouvat prvky nebo měnit velikost okna kvůli popupu nebo hintu.“** Nápověda, popup a bublina jen překrývají; nic se kvůli nim nehýbe ani nemění velikost. Kontejner prvku s nápovědou proto nemá `overflow: hidden`.
- Gesto je v `HoldOrDoubleTap` (`gesture.ts`), nápověda v `HintState` a `hintStyles` (`controls/hint.ts`). Karta, která má vlastní chráněný prvek (např. předvolby žaluzií v Klimatu), používá `HoldOrDoubleTap`, ne vlastní časovače.

## Ovládací prvky

- Prvky podle Apple HIG: přepínač (`<předpona>-switch`, 60 × 32 px, dlouhý bílý palec 40 × 26 px), segmentový ovladač (`-segmented`, kapsle 48 px, 40 px `compact`, 66 px s druhým řádkem) a posuvník (`-slider`, kapsle 52 px, tenká lišta 6 px, palec 38 × 24 px, nativní `input[type=range]` pod ním). Každý má účinnou dotykovou plochu aspoň 44 × 44 px.
- Události (bublají a přecházejí přes shadow root): `hdk-toggle` (`detail.checked` = požadovaný nový stav), `hdk-select` (`detail.value`), `hdk-input` (průběžně při tažení) a `hdk-change` (`detail.value` po nastavení).
- Vlastnosti chráněných prvků: `guarded`, `holdMs`, `doubleTapMs`, `hintSeconds`, `hint` (text nápovědy, dodá karta ve svém jazyce), `hintPlacement` přepínače (`above` / `below`).
- Barvy bere prvek z CSS proměnných `--hdk-*`, které karta namapuje na své (`:host { --hdk-accent: var(--ed-accent); … }`). Prvek nezná barvy karty ani světlý a tmavý režim; ten řeší karta tím, co do proměnných dosadí. Proměnné: `--hdk-accent`, `--hdk-switch-off`, `--hdk-track`, `--hdk-track-compact`, `--hdk-bar`, `--hdk-tick`, `--hdk-secondary`, `--hdk-seg-thumb`, `--hdk-seg-text`, `--hdk-seg-selected`, `--hdk-bubble`, `--hdk-bubble-text`. Každá má v prvku tmavou výchozí hodnotu.

## Konfigurace (společná pravidla)

- Každý klíč je volitelný; klíč bez hodnoty (null) znamená výchozí hodnotu. Entity výchozí hodnotu nemají.
- Chybná hodnota zastaví kartu chybou, která jmenuje klíč a co se čeká (`wallbox.boost must be a switch entity (switch.…), not sensor.wallbox_boost.`); nic se tiše neignoruje. Neznámý klíč uvnitř sekce je chyba, neznámé klíče na horní úrovni se tolerují (Home Assistant přidává vlastní: `grid_options`, `view_layout`).
- Chyby vznikají přes `fail()`, kartu jmenuje `withCardName("Energie Dashboard", …)` kolem `normalizeConfig`.
- Příklad YAML karty obsahuje úplně všechna nastavení s výchozími hodnotami a test karty hlídá, že žádné nechybí.

## Entity a data

- Stavy a atributy Home Assistantu jsou data za běhu: nic se nehádá (jednotka, znaménko, výchozí hodnota). `unavailable`, `unknown` a prázdný stav nejsou hodnota (`isNoValue`); je to chybějící údaj, ne poplach.
- Co o jednotce, znaménku a smyslu entity řekne jen karta, řeší karta (Energie převádí kW na W; Klima ořezává procenta). Kit čte číslo tak, jak je.

## Mobil a přístupnost

Platí pro každou kartu i každý prvek kitu: iPhone 14 Pro 393 × 852 na výšku a 852 × 393 na šířku, bez vodorovného posouvání od 320 px, dotyková plocha aspoň 44 × 44 px, tmavý i světlý režim, bez porušení axe-core, ovládání klávesnicí, přístupný název = viditelný text.

## Testy

- Kit: `npm test` = `tsc --noEmit` + `vitest` (jazyk, konfigurace, entity, gesto) + Playwright na `tests/harness.html` (přepínač, segmentový ovladač, posuvník: jedno klepnutí, dvojklep, podržení, tažení, klávesnice, nic se nehýbe, axe). Vite servíruje zdroje bez buildu.
- Karty: používají `testing/` kitu (server, konfigurace Playwrightu, `makeTest`, `runCoverage`, `axeViolations`); jejich vlastní testy a testovací stránka zůstávají v kartě. Chování ovládacích prvků v kartě (např. nápověda nad prvkem, nic se nehýbe) hlídá i karta.
- Nic se nehlásí jako prošlé, co se nespustilo.

## Verze a vydávání

- Verze kitu je `version` v `package.json` (a značka `vMAJOR.MINOR.PATCH`, až ji uživatel vytvoří). Karty drží konkrétní commit nebo značku, nikdy větev.
- Postup změny kitu: (1) změna zdroje a testů, `npm test` zelený, (2) úprava tohoto dokumentu a `README.md`, (3) commit a push na `main`, (4) v každé kartě `npm install git+https://github.com/michal-madle/ha-dashboard-kit.git#<commit>`, kontrola `resolved` v `package-lock.json`, `npm test` karty, commit se zmínkou commitu kitu. Změna jen dokumentace kitu nepotřebuje aktualizaci karet.
- Zpětně nekompatibilní změna (přejmenování události, vlastnosti, proměnné, exportu) zvyšuje MAJOR a obě karty se přepíšou v témže kole; do té doby karty drží starou značku. Nová volitelná vlastnost nebo export zvyšuje MINOR, oprava PATCH.
- Kit je veřejný (karty ho stahují bez tokenu). Nikdy v něm nejsou osobní údaje z Home Assistantu (GPS, sériová čísla, MAC adresy, přihlašovací údaje).
