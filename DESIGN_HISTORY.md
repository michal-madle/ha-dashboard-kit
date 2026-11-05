# DESIGN_HISTORY – ha-dashboard-kit

Jen archiv. Nic z tohoto dokumentu není závazné; platí `CURRENT_SPEC.md`, `AGENTS.md` a `DASHBOARD_UX_SYSTEM.md`. Pravidla vedení: `AGENTS.md`, oddíl Dokumentace. Nejnovější záznamy jsou nahoře. Stav záznamu: **potvrzeno** (zapsáno do spec), **nahrazeno**, **zamítnuto**, **nepotvrzeno** (otázka položena uživateli v chatu, do spec nepatří).

## 2026-11-05 · Kolečko bez znaku „%“ (potvrzeno uživatelem)

- Uživatel 5. 11. 2026 po kontrole popupu Větrací režim: „% se mi nelíbí ani u té energie. Upravit všude.“ Kolečko s procenty (Energie „Dnes zatím“, Klima Větrací režim) má jen číslo uprostřed, bez „%“ pod ním; `unit` zůstává pro kolečka s jinou jednotkou. Dřívější pravidlo „jednotka menší pod číslem“ platí jen pro ně.

## 2026-11-05 · Kolečko postupu jako společný prvek kitu (potvrzeno uživatelem)

- Uživatel 5. 11. 2026 po brainstormingu popupu Větrací režim v Klimatu (kolečko místo proužku, „jako jinde typ kolečko u výkonu nebo kroky“): „Jo bude to komponenta na více míst.“
- Zapsáno: `HdkRing` (`src/controls/ring.ts`, `<předpona>-ring`), převzato z `ring()` v `sun.ts` Energie beze změny vzhledu (40 px, tah 6, číslo `size × 0,3`, jednotka 10 px); barvy přes `--hdk-ring-*`. Energie ho používá místo vlastní kopie, Klima v popupu Větrací režim.
- Nepotvrzeno, otázka položena D. M.: jednotka 10 px je pod 11 px (HIG) a pod stylem Caption 1 12 px v `DASHBOARD_UX_SYSTEM.md`; zůstává, aby se vzhled Energie nezměnil.

## 2026-11-04 · Nové větráky v režimu větrání, sušička zpět na původní ID (potvrzeno uživatelem)

- Uživatel 4. 11. 2026: „nové větráky: ano patri do noveho rezimu“; „je aktualizovane automations.yaml“; „Pokud neco chybi, uprav to. ALE musis mi rict ze mam aktualizovat automatizace na HA.“; „susicka mela spatny id. vratil jsem to.“
- Zapsáno: `CURRENT_SPEC.md`, oddíl Home Assistant: větrací režim: čtyři větráky (koupelna přízemí, koupelna patro, koupelna ložnice, záchod patro). Uživatel sám doplnil do `yaml/automations.yaml` nové větráky do seznamů zapnutí a vypnutí a dvě automatizace dlouhého stisku. Doplněno: „Ventilation mode - po restartu HA“ čeká i na nové větráky.
- Nahrazeno: přejmenování sušičky na `…_susicka_susicka_…` ze záznamu výše neplatí, uživatel vrátil původní ID `technicka_mistnost_susicka_*` (obraz po změně: 13 entit zpět na původních ID). ID vrácena v mapě Energie, příkladu a testech Energie a v `export_hodiny.py`. Poslední hodinový export použil nesprávné ID (`export_report.txt`: BEZ DAT), sloupec sušičky je v něm prázdný; příští export ho naplní.
- Opraveno navíc podle obrazu (zastaralá ID v YAML): `climate.obyvaci_pokoj_ac_obyvak` → `climate.obyvak_ac_obyvak` v `configuration.yaml`; `switch.technicka_mistnost_ventil_c1_switch_1` a `…c2_switch_1` → `switch.technicka_mistnost_ventil_c1` a `…c2` v `scripts.yaml`. `sensor.baterie_skutecna_zmena_soc` a `sensor.baterie_zmena_soc_5_min` definuje `configuration.yaml` sám a v obrazu nejsou (ta část konfigurace není v Home Assistantu nasazená).
- Ověřeno: všechna ID v `yaml/automations.yaml` a `yaml/scripts.yaml` jsou v obrazu; YAML a šablona čekání se parsují; `check-docs` bez chyb; příklad a testy Energie jsou shodné s verzí, kde prošlo 43 testů.

## 2026-11-04 · Nové zařízení a nový obraz Home Assistantu (1861 entit)

- Uživatel 4. 11. 2026: „Pridal jsem zarizeni a udelal novy export entit. Aktualizuj vse nutne (entity map apod?)“ A k hodinovému exportu: „Hotovo: 336 hodin. […] a entities nove pushnute“.
- Změna obrazu `ha/entities.json` (1815 → 1861): přidáno 60, odebráno 14, změněno 12. Nová zařízení Větrák koupelna ložnice a Větrák záchod patro (Shelly 1PM Mini Gen4, oblast Koupelna) s automatizacemi „ventilation mode“ a štítek Ventilation na sedmi automatizacích větracího režimu. Zařízení Sušička bylo znovu přidáno (Shelly Plug M Gen3): entity mají nově v ID dvakrát `susicka` (například `sensor.technicka_mistnost_susicka_susicka_power`). Vstup větráku koupelna přízemí je nově `event.koupelna_vetrak_koupelna_prizemi` (dřív `…_input`).
- Aktualizováno: ID sušičky v `energie/ENTITY_MAP.md`, `examples/energie.yaml` Energie, testech Energie (`tests/scenarios.js`), `yaml/automations.yaml` a `energie/tyden/export_hodiny.py`; ID vstupu větráku v `yaml/automations.yaml`; počty entit v obou mapách. Každé přejmenování je ověřeno obrazem (staré ID zmizelo, nové je u stejného zařízení).
- Ověřeno: všechna ID v `yaml/automations.yaml` jsou v obrazu; `check-docs` bez chyb; `npm test` Energie v kopii: 43 testů prošlo (jeden test při první dávce selhal na zapomenutém prefixu sušičky ve fixtuře, opraveno). Historie sušičky před 4. 11. zůstává v Home Assistantu pod starými ID; hodinový export čte nová.
- Nepotvrzeno, otázka položena D. M.: patří nové větráky (koupelna ložnice, záchod patro) do větracího režimu? `yaml/automations.yaml` je v seznamu větráků nemá a `CURRENT_SPEC.md` kitu říká „dva větráky“. Do odpovědi se chování nemění.

## 2026-11-04 · Práce na `main`, první skutečný obraz Home Assistantu, mapy entit proti obrazu (potvrzeno uživatelem)

- Uživatel 4. 11. 2026: „tvoje větev bude main. všude. větev zruš a main přesun na ní.“ K otázkám: značka kitu „nerozumim“; token „ok“; první obraz: po spuštění `snapshot` výstup „Beze změny: 1815 entit.“; pravidlo 12 „nevim co je pravidlo 12“; plánovaný úkol Energie: „nemaž“ (zůstává vypnutý).
- Provedeno: `main` všech čtyř repozitářů posunut na commity z větve (fast-forward), další práce je rovnou na `main` (pravidlo 8). Smazání vzdálené větve `claude/blissful-faraday-dlnbcs` proxy odmítla (HTTP 403), větev smaže uživatel.
- Ověřeno: `snapshot.py` běží proti skutečnému Home Assistantu (1815 entit, 42 integrací, 11 oblastí, štítky Energy, Heating, Climate, Appliances, Mobility, Ventilation a další).
- Mapy entit přeodvozeny proti obrazu: všechna ID v mapách Energie i Klimatu v obrazu jsou a žádné z nich není zakázané. Opraveno: zásobník Energie je `water_heater.technicka_mistnost_tado_ce_tepla_voda` (doplněno do mapy a do příkladu karty, testy přejmenovány; staré entity integrace `tado` jsou v obrazu zakázané); v mapě Klimatu je automatizace pro Ložnici `automation.loznice_obnova_topeni_pri_zavrenem_okne_loznice` (dřív bez předpony `loznice_`). Mapy dál uvádějí jen entity, které karta používá nebo které spec výslovně zmiňuje; ostatní aktivní entity se štítky karty (Energie 294, Klima 378) v mapách nejsou.
- Ověřeno: `npm ci` a `npm test` v kopiích karet s novým pinem kitu: Energie 43 testů, Klima 31 testů prošlo; `check-docs` bez chyb ve všech třech repozitářích.
- Potvrzeno uživatelem po vysvětlení pravidla 12: „sensor.goodwe_pv_power je ok veřejný, jména místností nevadí“. ID entit a jména místností zůstávají v kartách, ve spec, v příkladech i v testech; zapsáno do `AGENTS.md`, pravidlo 12. Token zrušen („token zrušen“). Značka kitu se nevytváří: „neplánuju další force push“, piny karet zůstávají na commitu `79c0d62…` (je v historii `main`).

## 2026-11-04 · `ha-config` jako obraz Home Assistantu, jeden zdroj entit, zjednodušení, vazby kit–karty (potvrzeno uživatelem)

- Uživatel 4. 11. 2026: „Zklamu tě vše je squash/force push. Fetchni si to. Oprav vazby mezi projekty aby šel npm install. Je nový export entit. Nicméně, šlo by to nějak sjednotit? Aby byl jen jeden zdroj? Nebaví mě dělat 4 exporty šablon. Navíc nevím co kde dát a vzít. Může být na jednom místě entity HA? Třeba komplet, a ty si pak vybereš?“ A dále: „A nerozumim nekterym souborum, spotrebice.txt, forecast.md apod. Zjednodus to. Vznikalo to bez nejake architektonicke vize, ted uz je to vetsi, mame repo pro private entity. Neni to potreba mit rozdelene. Udelejme z toho obraz HA na ktery muzes sahnout. A ja abych vedel ze kdyz neco pridam ze co mam pustit. A u entit nejlepe bez last modified a updated, aby nebylo tisice zmen s kazdym exportem.“
- Zjištěno: uživatel squashnul a force-pushnul `main` všech čtyř repozitářů (jeden commit „Initial version“). Nový `klima/entity/klima.json` nebyl export Klimatu, ale export Energie (systémy FVE, Wallbox, Auto …, bez místností); přepsal export místností (465 entit s oblastmi). Místnosti jsou obnoveny z git historie `ha-config` a převzaty do obrazu.
- Zapsáno: místo čtyř šablon `*.jinja` a pěti exportů `*.json` je v `ha-config` jeden obraz `ha/entities.json` (všechny entity, jedna na řádek, seřazeno podle oblasti a zařízení, bez stavů a časů `last_changed`, `last_updated`, `last_reported`, bez polohy, sériových čísel, MAC adres a tokenu), který vytváří `snapshot.py` (spouští se `snapshot.cmd`, čte registry entit, zařízení, oblastí a štítků přes WebSocket a vypíše, co přibylo, ubylo a změnilo se). Karty se dívají do obrazu a do `ha-config/<karta>/ENTITY_MAP.md`. `check-docs` čte obraz z `ha-config/ha/entities.json`. `README.md` v `ha-config` říká, co kdy pustit.
- Zjednodušeno: `FORECAST.md` sloučen do `TYDEN.md` (příloha na konci, text beze změn); `spotrebice.txt` odstraněn (obsahoval jen komentáře, bez jediné položky; spotřebiče se hledají podle názvu); z hodinového exportu Energie odstraněna prázdná šablona `popisky_sablona.csv` (336 řádků, žádný vyplněný); pravidlo 11 a 12 a tabulky v `AGENTS.md` upraveny. První `ha/entities.json` je složen ze starých exportů (900 entit, bez `integration`, `labels`, `model`), první spuštění `snapshot.cmd` ho nahradí úplným obrazem.
- Vazby kit–karty: obě karty měly kit připnutý na commit `e96c781…`, který squash z `main` odstranil. Piny jsou přepnuty na `79c0d62…` (aktuální `main` kitu, obsah `src/` stejný; `npm ci` a sestavení ověřeny). Trvalé řešení je značka (tag) kitu, která přežije force push `main`; session ji nemůže vytvořit (push značky proxy odmítla, HTTP 403). Vytvoří uživatel (`git tag v0.1.0 79c0d62`, `git push origin v0.1.0`), potom se piny přepnou na `#v0.1.0`.
- Ověřeno: `check-docs` na kitu, Klimatu a Energii; `test_snapshot.py` (čisté řádky, stabilní výstup při jiných stavech a pořadí, porovnání, celý běh proti falešnému Home Assistantu přes WebSocket); `npm ci` a `npm run build` kopií obou karet (bundle Klimatu shodný, u Energie se liší jen časová značka v bannéru). `snapshot.py` ani přepracovaný `export_hodiny.py` nebyly spuštěny proti skutečnému Home Assistantu; `npm test` karet se nespouštěl (kód se nezměnil).

## 2026-11-04 · Tvrdé pravidlo: veřejné repozitáře jen s veřejnými věcmi, `ENTITY_MAP.md` v `ha-config` (potvrzeno uživatelem)

- Uživatel 4. 11. 2026 odpověděl na otázky po přesunu: token: „ok udělám“; plánovaný úkol Energie týdenní ladění: „úkol stejne nechci to byl omyl. Popis ok, ale ne automatika“; přeodvození `ENTITY_MAP.md` Energie z nových exportů: „zatím ne, az po novem exportu“; mapa entit: „entity map taky přesun. V dashboardu budou jen veřejné věci. Private budou v ha-config. Tvrdé pravidlo“; staré větve: „ok smažu“.
- Zapsáno: `AGENTS.md`, pravidlo 12 (soukromé je exporty a `ENTITY_MAP.md`, konfigurace Home Assistantu, hodinová data, týdenní ladění, skripty nad vlastním HA, tokeny a osobní údaje). `ENTITY_MAP.md` obou karet je v `ha-config` (`<karta>/entity/ENTITY_MAP.md`).
- `check-docs.mjs`: mapu entit čte z `ha-config` a kontroluje ji jako součást karty; ve veřejném repozitáři hlásí soukromé soubory (`ENTITY_MAP.md`, `TYDEN.md`, `FORECAST.md`, `token.txt`, `tokens.txt`, `.env`, `automations.yaml`, `scripts.yaml`, `configuration.yaml`, `secrets.yaml`), složky `HA entities` a `HA config` a vzory údajů (lokální IP adresa, token JWT, VIN, `notify.mobile_app_<jméno>`). Vyzkoušeno na syntetickém repozitáři; skutečné repozitáře jsou čisté.
- Nahrazeno: `ENTITY_MAP.md` jako povinný soubor v kartě (`AGENTS.md`, Soubory v repozitáři karty). Z README Energie odstraněny oddíly „Export entit z Home Assistantu“ a „Týdenní ladění předpovědi“, z README Klimatu oddíl „Týdenní ladění (export hodinových dat)“: popisují soukromé věci, postup je v `ha-config` (`README.md`, záhlaví skriptu, `TYDEN.md`).
- Plánovaný úkol „Energie týdenní ladění“ (neděle 19:40) je vypnut (ne smazán: smazání by smazalo i záznamy jeho běhů). Týdenní analýza je jen na požádání; popis postupu zůstává v `TYDEN.md`.
- Odloženo uživatelem: `ENTITY_MAP.md` Energie se z exportů z 3. 11. přeodvodí až po novém exportu.
- Nepotvrzeno, otázka položena D. M.: zda pod pravidlo 12 patří i ID entit v `CURRENT_SPEC.md` a příkladech karet a jména místností v Klimatu (Maxík, Mikuláš). Do potvrzení se nic nemění.
- Poznámka: starší verze `ENTITY_MAP.md` (včetně VIN v ID entit auta) zůstávají v historii gitu Energie a Klimatu.

## 2026-11-04 · Soukromá data v `ha-config`, nová struktura a názvy (potvrzeno uživatelem)

- Uživatel 4. 11. 2026: „Udelal jsem uklid. adresare HA entities, tools a exporty jsem presunul do privatniho ha-config. Nacti si zmeny. Potrebuji abys mi s tim pomohl - uprav vse tak aby davalo smysl. Klidne to rozdel, ale porebuju aby to melo strukturu a konzistentni nazvy. Klidne to prejmenuj jak chces. Je mi to jedno, nesmi se nic smazat, o nic prijit - ale kde to bude a jak se to bude jmenovat je mi jedno. V ostatnich repech oprav nazvy a odkazy.“ A dále: „Klidne cokoli uprav, smaz, presun - i mezi repository. Pokud bys nasel dalsi veci co patri jinam, uprav to. Na konci udelame squash a force push.“
- Nahrazeno: zamítnutí přesunu `HA config/` do privátního repa (záznam 3. 11. níže). Důvod zamítnutí byl, že kit je veřejný a `HA config/` obsahoval jména dětí, lokální IP adresy žaluzií a názvy notify služeb; uživatel dnešním pokynem povolil přesun mezi repozitáře a `HA config/` je nyní `yaml/` v `ha-config`. `CURRENT_SPEC.md` kitu už říká, že kit je veřejný a nemá osobní údaje z Home Assistantu.
- Nová struktura `ha-config` (podrobně `README.md` tam): adresář první úrovně = karta (`energie/`, `klima/`) nebo `yaml/`, uvnitř téma (`entity/`, `tyden/`, `hodiny/`); šablona `X.jinja` vytvoří `X.json`; názvy bez diakritiky, malá písmena; starší verze do `archiv/`.
- Přejmenování (vše v `ha-config`): `exports/energie.json` → `energie/entity/energie.json`; `exports/export_entit_energy.jinja` → `energie/entity/energie.jinja`; `exports/spotrebice_helpery.json` → `energie/entity/spotrebice_helpery.json`; `exports/export_helpery.jinja` → `energie/entity/spotrebice_helpery.jinja`; `exports/spotrebice.json` → `energie/entity/archiv/spotrebice_2026-11-02.json`; `exports/export_spotrebice.jinja` (ve skutečnosti novější export, 63 entit) → `energie/entity/spotrebice.json`; šablona `energie/entity/spotrebice.jinja` obnovena z historie Energie (commit `3aae47c`); `exports/klima.json` → `klima/entity/klima.json`; `exports/export_entit_klima.jinja` → `klima/entity/klima.jinja`; `exports/README-energy.md`, `README-klima.md` → `energie/entity/README.md`, `klima/entity/README.md` (společný postup do `README.md`); `tools/export_hodiny.py`, `tyden_data.py`, `spotrebice.txt` → `energie/tyden/`; `tools/export_hodiny_klima.py`, `test_export_hodiny_klima.py` → `klima/hodiny/export_hodiny.py`, `test_export_hodiny.py`; `export-tyden/*` (výstupy) → `energie/tyden/export/`; starší běh exportu z `tools/` → `energie/tyden/archiv/export_2026-11-03/`; `export-tyden/export-tyden.cmd` → `energie/tyden/export.cmd`; `TYDEN.md`, `FORECAST.md`, `data/` z Energie → `energie/tyden/`; `HA config/*.yaml` z kitu → `yaml/`.
- Token: `export-tyden.cmd` a `tools/tokens.txt` obsahovaly dlouhodobý přístupový token v čitelné podobě (do `ha-config` se dostal s kopií složky, zatímco `.gitignore` karty Energie token ignoroval). `export.cmd` nyní čte token z `token.txt` nebo `HA_TOKEN`, `tokens.txt` je odstraněn z indexu a `.gitignore` token ignoruje. Token zůstává v historii gitu `ha-config`; je třeba ho v Home Assistantu zrušit a vytvořit nový.
- Změněno: pravidlo 11 (týdenní ladění je v `ha-config`), `check-docs.mjs` čte exporty z `ha-config/<karta>/entity/`, agenti (cesty k exportům), `AGENTS.md` (spuštění session se čtyřmi repozitáři, oddíl Soukromý repozitář ha-config).
- Ověřeno: `check-docs` na kitu, Klimatu a Energii (bez chyb; se špatnou cestou k `ha-config` hlásí chyby), `python3 klima/hodiny/test_export_hodiny.py`, `tyden_data.py` na kopii dat, byte-shoda přesunutých exportů. Kód karet se nezměnil, jejich `npm test` se nespouštěl. `export_hodiny.py` Energie jen zkompilován, proti Home Assistantu nespuštěn.

## 2026-11-04 · Větrací režim: 30 min, lamely hned, push po doběhnutí časovače (potvrzeno)

- Uživatel 4. 11. 2026: „30 min.“ (délka režimu); po návrhu lhůty 5 min pro lamely: „zaluzie se obnovi / zavrou hned po skonceni rezimu, nezakladej novou lhutu 5min. asi jsem to predtim spatne pochopil. Nechtel jsem aby zustaly vecer otevrene. Zavri a posli notofikaci ze zavrit okna - kdyz je zavru rucne nebo long pushem, tak neposilat push“.
- Zapsáno: `CURRENT_SPEC.md`, oddíl Home Assistantu: větrací režim (30 min, push po doběhnutí časovače, bez lhůty). Zamítnuto: lhůta 5 min po konci režimu pro lamely (nezavedena). Nahrazeno: „žádné nové notifikace“ (3. 11.) výjimkou pro push po doběhnutí časovače.
- Konfigurace Home Assistantu je v soukromém `ha-config`, `yaml/` (časovač `00:30:00`, automatizace „Ventilation mode - konec časovače“ s notifikací); v Home Assistantu se aktualizuje ručně. Zobrazení v kartě Klima: `DESIGN_HISTORY.md` Klimatu, záznam z 4. 11.

## 2026-11-03 · Větrací režim v Home Assistantu: chování (potvrzeno)

- Uživatel 3. 11. 2026: „Ráno nebo večer chci otevřít okna, zapnout větráky a vyvětrat. Pak zavřít okna a vypnout větráky.“ Chce jasná a jednoduchá pravidla, nic překombinovaného, žádné obtěžování.
- Zapsáno: `CURRENT_SPEC.md`, oddíl Home Assistant: větrací režim. Zde se pravidla neopakují.
- Odpovědi na pět otázek: (1) večerní zavírání žaluzií za běhu režimu: „1 souhlas“; (2) long push na větráku, který byl vypnut single pushem: „takhle je to ok“, tedy zůstává dnešní chování, které řídí stav větráku po stisku, ne stav režimu; (3) 15 s ignorování ventilátoru po změně režimu: „stačí“; (4) 15 min jako jedna hodnota: „ok“; (5) zkouška na Shelly: „ano long push na B zrušil timer na A a oba běží porad“.
- Nahrazeno: dosavadní automatizace v `HA config/automations.yaml` se liší od spec (ověřeno čtením): 20min `delay` uvnitř automatizace, lamely se otevřou jen při zapnutí a jen u žaluzie ve stavu `closed`, stojanový ventilátor řídí jen režim a ne naopak, vypnutí režimu lamely nevrací. Spec platí, automatizace se přepíšou.
- Konec režimu: Claude navrhl konec 2 min po zavření posledního okna; uživatel: „Režim končí IHNED po zavření posledního okna. Zapnu-li ho a do 2 min neotevřu žádné okno, taky skončí.“ Z návrhu zůstala jen druhá věta. Délka 20 min → 15 min („Mám teď když je venku 5-10°C vyzkoušené že 15min je úplně ok.“).
- Zamítnuto uživatelem: automatický start nebo konec podle CO₂ („Pak by zůstalo otevřené okno bez podpory větrání, nebo zase by se vířil vzduch bez otevřeného okna.“). Žádné nové notifikace (souhlas). Dveře na zahradu v obýváku se nepočítají („jsou v přízemí“). Klimatizace ve Větrání zatím mimo režim („zatím nechat být a ignorovat“, možná časem). Ztlumení zvuku ventilátoru se neřeší, zvuk je vypnutý.
- Odloženo uživatelem, není rozhodnutí: zapínat jen větráky v koupelnách s neuzavřenými dveřmi. Vyžaduje senzory dveří koupelen, které nejsou. Uživatel: „zatím neřešit“, ale být připraven; při návrhu automatizací počítat se seznamem zařízení režimu s možností doplnit podmínku.
- Opuštěné návrhy Claude: přepínat režim podle stavu režimu, ne větráku (uživatel ponechal dnešní chování); zámek „lamely vrací jen žaluzie ve stavu, ve kterém je mód nechal“ (nahrazen nápadem uživatele s plánovačem žaluzií).
- Ověřeno: `HA config/automations.yaml`, `scripts.yaml`, `configuration.yaml`, `ENTITY_MAP.md` Klimatu, skript Shelly od uživatele, zkouška uživatele (otázka 5).
- Implementace 3. 11. 2026 (`main`): `HA config/` má automatizace „Ventilation mode - …“, skript `ventilace_lamely`, upravený `zaluzie_faze` a v `configuration.yaml` časovač, plán náklonu lamel (4×) a součtový senzor oken. Syntaxe YAML a šablony ověřeny skriptem; v Home Assistantu zatím nespuštěno.
- Konzultace s agenty 3. 11. 2026 (shrnutí): `dashboard-critic` prošel kód proti spec. Opraveno: souběh plánovače žaluzií s návratem lamel, čekání na dojezd lamel, návrat žaluzie z nedostupnosti. Neověřeno bez HA: odezva stavu Shelly, výška žaluzie po otevření lamel u polohy nad 5 %, platnost `preset_mode: Straight Wind`. Návrh karty Klima: `DESIGN_HISTORY.md` Klimatu, záznam z 3. 11.
- Uživatel 3. 11. 2026 po návrhu karty Klima a otázkách: „Vše kromě repa ok. Uprav to.“ Potvrzeno: Ukončit v kartě jedním klepnutím (výjimka v Chráněném ovládání), zapnutý stojanový ventilátor spustí režim, jen když je otevřené okno (dřív: vždy; se zavřenými okny by ho režim po 2 min vypnul), název a štítek viz `DESIGN_HISTORY.md` Klimatu. Zapsáno do `CURRENT_SPEC.md`, automatizace upravena.
- Zamítnuto uživatelem: přesun `HA config/` do privátního repa. Kit zůstává veřejný; obsahuje jména dětí, lokální IP adresy žaluzií a názvy notify služeb (upozornění bylo předloženo).

## 2026-11-03 · Číslo a jednotka v dlaždici: číslo větší, jednotka menší a šedá (potvrzeno; Klima nepotvrzeno)

- Uživatel 3. 11. 2026 (návrh hlavního Energy flow, varianta C): „Beru variantu C“; na otázku, zda má typografie čísel platit i pro Klima: „Ano změn všude“. Podrobnosti a ostatní rozhodnutí o diagramu: `DESIGN_HISTORY.md` Energie, záznam z 3. 11.
- Zapsáno: `DASHBOARD_UX_SYSTEM.md`, Vizuální a UI jazyk, „Pravidlo pro číslo a jednotku v dlaždici“. Zavedeno v Energii.
- Nepotvrzeno, otázka položena D. M.: Klima nemá dlaždice, ale řádky místnosti, kde mají jednotky stejnou velikost jako hodnoty (`CURRENT_SPEC.md` Klimatu, Jednotná velikost), a hlavní karta místnosti je odsouhlasená. V Klimatu se nic nemění, dokud uživatel neřekne, co přesně se má změnit.

## 2026-11-03 · Týdenní ladění Energie se ukládá, `TYDEN.md` a `FORECAST.md` jsou povolené (potvrzeno)

- Uživatel 3. 11. 2026: „Chtěl bych v repu mít historii těch našich týdenních analýz. […] Je nutný to trackovat abychom to mohli časem analyzovat komplexně. Asi jsem to nechal smazat omylem. Uprav i pravidla aby ty soubory byly ok a nemazaly se.“
- Nahrazeno: v pravidle 2 věta, že `TYDEN.md` neexistuje a nezakládá se (rozhodnutí 2. 11.). Nové pravidlo 11, `check-docs` povoluje `TYDEN.md` a `FORECAST.md` (už nejsou v `FORBIDDEN`, značka nepotvrzeného na `TYDEN.md` se zrušila).

## 2026-11-02 · Texty podle jazyka v konfiguraci (potvrzeno)

- Uživatel 2. 11. 2026 (po názvech skupin v Energii): „Název více jazykově super. To chci všude. Každý name i title bude mít podporu multilamguage. Energy i klima Dashboard. Připrav i examples.“
- Zapsáno: kit `localizedText`, `pickText`, `allTexts` v `src/config.ts`; karty je používají pro každé `name` a `title`. Pravidlo ve `CURRENT_SPEC.md`, oddíl Konfigurace.

## 2026-11-02 · Pravidla dokumentace (potvrzeno)

- Uživatel 2. 11. 2026: „Zkonsoliduj všechny md soubory. Chci všude ukládat design history. Chci jen ověřené a potvrzené věci. Pokud něco není ověřené a potvrzené, ptej se tady ne v todo. Už nesmí nastat situace, že si někde koliduje zadání s nějakým jiným výstupem. Zápis si to a příště to udělej stejným způsobem.“
- Zapsáno do `AGENTS.md` kitu, oddíl Dokumentace. Kontrola: `tools/check-docs.mjs`.
- Nahrazeno: dřívější pravidlo „historii nevést, neplatné se maže“ (Energie `MEMORY_SUMMARIZED.md`, `.github/copilot-instructions.md`) a soubory `TODO.md`, `AUDIT.md`, `IDEAS.md`, `MEMORY_SUMMARIZED.md`, `TYDEN.md` (Energie, Klima, kit). Jejich obsah je přenesen do `DESIGN_HISTORY.md` karet jako nepotvrzený.
- `AI_MCP.md` (obecný návod na připojení Claude k Home Assistantu) přesunut z karty Energie do kitu, protože není specifický pro kartu. Technická tvrzení v návodu nebyla znovu ověřována.

## 2026-11-02 · Nepotvrzené body kitu (dříve `TODO.md`, K1–K4) · nepotvrzeno, otázka položena 2. 11. 2026

- **K1. Posuvník Klima.** Klima má vlastní posuvník (časovač Topení, cíl teploty) v hlavním souboru a ve stylech; `HdkSlider` je jeho ekvivalent podle HIG. Úkol: přepnout Klima na `HdkSlider` beze změny chování (testy Klima musí zůstat zelené), čímž zmizí druhá kopie.
- **K2. Nápověda u chráněných ovladačů.** Energie ukazuje nápovědu jako bublinu nad ovladačem se vychýlením ovladače (`HintState`, `hintStyles`). Klima ukazuje u předvoleb žaluzií nápovědu jako řádek pod tlačítkem (`.preset-hint`) a stejným řádkem hlásí i chybu odeslání. Rozhodnout: přepnout Klima na bublinu (chyba odeslání zůstane řádkem), nebo nechat rozdílné.
- **K3. Barvy a povrchy podle HIG.** Obě karty mají tmavou a světlou sadu povrchů (`--ed-*` v Energii, `--kd-*` v Klimatu). Shodují se karta `#1C1C1E` / `#FFFFFF`, bublina `#3A3A3C` a barva „bez dat“ `#8E8E93` (světlá `#6E6E73`); liší se jen vedlejší text (tmavý `#98989F` × `#9A9AA0`, světlý `#5F5F66` × `#6C6C70`). Návrh: společná sada `--hdk-*` pro tyto povrchy s mapováním karet; potvrdit, že se vedlejší text sjednotí na jednu hodnotu.
- **K4. Společný vizuální jazyk: rozdíly Klima × kit.** Společný vizuální jazyk je od 2. 11. jen v [DASHBOARD_UX_SYSTEM.md](./DASHBOARD_UX_SYSTEM.md). Klima se od něj liší (tabulka tamtéž): oranžová `#FF9F0A` × `#FF9230`, červená `#FF453A` × `#FF4245`, karta s přechodem × plochý povrch, klíč `theme`. Návrh: Klima přejde na hodnoty společného jazyka (jeho tmavá paleta je podle vlastní specifikace „testovací, není finální“, Klima TODO C3) a klíč `theme` zmizí (HIG Dark Mode: „Avoid offering an app-specific appearance setting“). Potvrdit, nebo určit, co se místo toho změní ve společném jazyce.

## 2026-11-02 · Společný vizuální jazyk a agenti v kitu (potvrzeno)

- Společný vizuální a UI jazyk byl 2. 11. 2026 přesunut ze `CURRENT_SPEC.md` karty Energie do `DASHBOARD_UX_SYSTEM.md` beze změny významu; agenti a jejich společná pravidla jsou jen v kitu (`.claude/agents/`, `AGENTS.md`).
- Rozhodnutí uživatele 27. 10. 2026: Apple Human Interface Guidelines všude, na všech kartách, bez Liquid Glass.
- Rozhodnutí uživatele 28. 10. 2026: obě karty mají být udělané stejně; společný kód a pravidla se zakládají v kitu (viz `CURRENT_SPEC.md`, Cíl).

## Rekonstrukce z historie Gitu (vygenerováno 2. 11. 2026, nezávazné)

Chronologický seznam všech commitů do `6409b50` (včetně) a u každého řádky z `CURRENT_SPEC.md`, `DASHBOARD_UX_SYSTEM.md`, které commit nahradil (text zkrácen na 600 znaků; úplné znění: `git show <commit>`). Slouží jako doplněk historie tam, kde nebyla vedena průběžně; potvrzené je jen to, co je dnes ve spec.

- `fc6e8ff` 2026-10-28 · Kit: i18n, entity, konfigurace, gesto, ovladaci prvky, testy a build
- `e4ced36` 2026-10-28 · Build: dekoratory Lit z kitu v node_modules prelozit jako experimentalni
- `cc031ca` 2026-10-28 · Dokumentace kitu: zavislost na commitu, technicka pravidla, K2
  - nahrazeno: „- Závislost: `"ha-dashboard-kit": "github:michal-madle/ha-dashboard-kit#v0.1.0"` v `package.json` karty. Vždy konkrétní značka (tag), nikdy větev: build karty musí být opakovatelný. `package-lock.json` pevně drží commit.“
  - nahrazeno: „- Kit se v kartě neupravuje (ani v `node_modules`). Chyba nebo nová vlastnost se řeší v kitu: změna, test, značka, aktualizace obou karet (oddíl Verze).“
  - nahrazeno: „- Verze kitu je značka `vMAJOR.MINOR.PATCH` v gitu a `version` v `package.json`. Karty drží konkrétní značku.“
  - nahrazeno: „- Postup změny kitu: (1) změna zdroje a testů, `npm test` zelený, (2) úprava tohoto dokumentu a `README.md`, (3) commit, značka, push, (4) v každé kartě `npm install github:michal-madle/ha-dashboard-kit#vX.Y.Z`, `npm test` karty, commit se zmínkou verze.“
- `6af00e4` 2026-10-28 · TODO kitu: K1-K3 jako jasne otazky, nepozadane napady odstraneny
- `eedb6c2` 2026-10-29 · i18n: two() pro dve desetinna mista
  - nahrazeno: „- Čísla, čas a data podle profilu Home Assistantu (`hass.locale`): formát čísel `language`, `system`, `comma_decimal`, `decimal_comma`, `space_comma`, `quote_decimal`, `none`; čas `language`, `system`, `12`, `24`; datum `language`, `system`, `DMY`, `MDY`, `YMD`. Bez profilu platí jazyk karty: česky a švédsky „21,3“ a „46 %“, anglicky „21.3“ a „46%“ (mezeru před % určuje jazyk, jak ji píše Home Assistant).“
- `b3241f5` 2026-11-02 · Add agent hub: shared agents, rules and UX system
- `6409b50` 2026-11-02 · Add common visual and UI language to the UX system
  - nahrazeno: „5. **Agenti, jejich společná pravidla a UX systém** patří do kitu (`.claude/agents/`, `AGENTS.md`, `DASHBOARD_UX_SYSTEM.md`). Karta má jen vlastní `AGENTS.md` s omezeními a zdroji; kopie agentů ani UX systému v kartě se nezakládá. Do `node_modules` karet se nic z toho nedostane (`files` v `package.json`).“
  - nahrazeno: „Konkrétní rozhodnutí, která tento systém dnes naplňují (vzhled určuje spec karty, dokud se pravidla nesjednotí, viz [TODO K3](./TODO.md)):“
  - nahrazeno: „- Energie: [Vzhled podle Apple HIG](https://github.com/michal-madle/ha-energie-dashboard/blob/main/CURRENT_SPEC.md#vzhled-podle-apple-hig)“
  - nahrazeno: „- Klima: oddíly Vizuální pravidla a Barvy v [CURRENT_SPEC.md](https://github.com/michal-madle/ha-klima-dashboard/blob/main/CURRENT_SPEC.md)“
