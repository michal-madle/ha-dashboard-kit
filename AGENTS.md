# Agents – společné centrum

Agenti pro karty Klima i Energie jsou jen tady, v `.claude/agents/`. Karty žádné vlastní kopie nemají. Každý agent běží ve vlastním kontextu a smí jen číst. Tento soubor je jejich společný základ: každý agent ho čte jako první, potom `AGENTS.md` karty, kterou posuzuje. Hlavní session podle něj také vede dokumentaci (oddíl Dokumentace).

## Jak session spustit (jeden projekt)

Session se otevírá v kitu a obě karty a soukromý repozitář `ha-config` (obraz Home Assistantu) se přidají jako další adresáře:

```bash
cd ha-dashboard-kit
claude --add-dir ../ha-klima-dashboard --add-dir ../ha-energie-dashboard --add-dir ../ha-config
```

V cloudu se připojí všechny čtyři repozitáře. Hlavní session předá každému agentovi absolutní cesty ke kartám a k `ha-config`. Bez nich agent hledá adresáře `ha-klima-dashboard`, `ha-energie-dashboard` a `ha-config` mezi pracovními adresáři.

## Agenti

| Agent | Role |
|---|---|
| `klima-expert` | Klima: Home Assistant, HVAC a vnitřní vzduch. Signály, abnormality, akce uživatele. Nenavrhuje UI. |
| `energie-expert` | Energie: FVE, baterie, síť, wallbox, bojler, zásobník, auto. Signály, abnormality, akce uživatele. Nenavrhuje UI. |
| `idea-generator` | Nápady a zjednodušení nad rámec spec, i napříč kartami. Nenavrhuje UI ani implementaci. |
| `ux-architect` | Návrh podle `DASHBOARD_UX_SYSTEM.md`. Neřeší implementaci. |
| `dashboard-critic` | Nezávislá kritika hotového návrhu. Nic nevytváří. |

## Dokumentace (rozhodnutí uživatele 2. 11. 2026)

Uživatel: „Zkonsoliduj všechny md soubory. Chci všude ukládat design history. Chci jen ověřené a potvrzené věci. Pokud něco není ověřené a potvrzené, ptej se tady ne v todo. Už nesmí nastat situace, že si někde koliduje zadání s nějakým jiným výstupem. Zápis si to a příště to udělej stejným způsobem.“

### Pravidla

1. **Jen ověřené a potvrzené.** Do `CURRENT_SPEC.md`, `ENTITY_MAP.md`, `README.md`, `AGENTS.md`, `CLAUDE.md` a kódových pokynů patří jen (a) rozhodnutí uživatele s datem a jeho slovy, (b) fakta ověřená exportem entit, kódem na release tagu, dokumentací zdroje nebo měřením. Návrh, odhad, domněnka, „k ověření“, „nedoloženo“, nepotvrzená entita nebo číslo, které uživatel nerozhodl, se do těchto souborů nepíše.
2. **Neověřené a nepotvrzené je otázka uživateli v chatu, hned.** Ne do souboru. Soubory `TODO.md`, `AUDIT.md`, `IDEAS.md` a `MEMORY_SUMMARIZED.md` neexistují a nezakládají se. Výjimka z rozhodnutí uživatele 3. 11. 2026 (viz pravidlo 11): `TYDEN.md` v `ha-config` (`energie/tyden/`) je záměrný záznam týdenního ladění a maže se jen na výslovný pokyn uživatele. Otázka říká, co chybí, co doporučuji a co která odpověď způsobí. Po odpovědi hlavní session zapíše potvrzené do `CURRENT_SPEC.md` (případně `ENTITY_MAP.md`) a do `DESIGN_HISTORY.md`.
3. **`DESIGN_HISTORY.md` je v každém repozitáři** (kit, Klima, Energie) a je jediná historie. Je to jen archiv: nic z ní není závazné, spec ji nepřebíjí. Zapisuje se do ní při každé změně spec nebo rozhodnutí: datum, co uživatel řekl (jeho slova), co se tím nahradilo, zamítnuté a opuštěné návrhy s důvodem, předložené a nepotvrzené návrhy (stav „nepotvrzeno, otázka položena D. M.“), výsledek konzultace s agenty (shrnutí) a ověření. Nahrazený text se ze spec maže a přesouvá se sem.
4. **Každá věc má jedno místo** (tabulka níže). Co je jinde, je jen odkaz. Stejné pravidlo, číslo nebo entita se nikdy nepíše na dvě místa.
5. **Žádná kolize.** Spec platí vždy. Výstup agenta, kód, příklad, README nebo starší poznámka, které jí odporují, se nezapisují a nepoužívají: rozpor se řeší otázkou v chatu, ne tichou úpravou. Každý agent v závěru výstupu uvede řádek „Konflikty se spec: …“ (nebo „žádné“) a hlavní session ho před předáním uživateli ověří.
6. **Priorita u všeho, co se ptá uživatele nebo mu dává úkol (uživatel 2. 11. 2026: „Potřebuju vědět, co je pro tebe blocker nebo high priority. Vždy.“).** Každá otázka a každý úkol má štítek **BLOCKER** (bez odpovědi nejde pokračovat nebo hrozí chyba), **HIGH** (zásadně mění návrh nebo kód), **NORMAL** nebo **LOW**. Řadí se od BLOCKERu.
7. **Odpovědi uživateli jsou krátké, věcné a srozumitelné (uživatel 2. 11. 2026: „Musíš psát krátce, věcně a hlavně stručně. Žádné kecy.“). Úkoly a otázky jsou stručné body, žádné slohy; kroky jsou jednoduché (co kam kliknout, co poslat).** Každá odpověď s otázkami nebo úkoly znovu vypíše všechno nevyřízené z minula, protože uživatel se v konverzaci nevrací zpět; vyřízené vypustí.
8. **Vždy se pracuje nad větví `main`** ve všech repozitářích (kit, Klima, Energie, `ha-config`; uživatel 2. 11. 2026: „pracuj vždy nad main branchi“). Změny se commitují a pushují přímo na `main` po zeleném `check-docs`; větve `claude/…` se nezakládají, pokud uživatel nepožádá. Force push jen se souhlasem uživatele.
9. **Změna vzhledu se před předáním prohlédne na screenshotech** (uživatel 2. 11. 2026: špatně čitelné černé ikony v tmavém režimu „by měl odhalit ux designer nebo oponent“): hlavní session pořídí screenshoty změněných obrazovek v tmavém i světlém režimu na 393 px (Playwright) a `ux-architect` a `dashboard-critic` je prohlédnou (čitelnost, kontrast, velikost, zalamování, stejný vzhled jako ostatní prvky) dřív, než se změna oznámí hotová. Test s computed stylem hlídá barvy, které axe nevidí (výplň SVG). Agent projde kontrolní seznam „Visual review checklist“ ve svém souboru (každé číslo má popisek, odebrané prvky nezhoršily srozumitelnost, žádné rozpory ve stavu, zarovnání, hierarchie) a hlavní session jeho návrhy neprovádí naslepo: ověří je proti zadání uživatele a historii (oponent navrhl odebrat popisek „DŮM“ a číslo zůstalo bez popisku).
10. **Před každým commitem dokumentace** hlavní session spustí `node ../ha-dashboard-kit/tools/check-docs.mjs <karta>` (kontrola zakázaných souborů, značek nepotvrzeného, odkazů mezi soubory, entit proti obrazu Home Assistantu `ha-config/ha/entities.json` a soukromých souborů či údajů ve veřejném repozitáři, pravidlo 12); výstup musí být bez chyb. Kontrola nenahrazuje čtení.
11. **Týdenní ladění Energie se ukládá do repozitáře `ha-config`** (uživatel 3. 11. 2026: „Chtěl bych v repu mít historii těch našich týdenních analýz. […] Je nutný to trackovat abychom to mohli časem analyzovat komplexně. Asi jsem to nechal smazat omylem. Uprav i pravidla aby ty soubory byly ok a nemazaly se.“; uživatel 4. 11. 2026 po přesunu soukromých dat do `ha-config`: „Klidne cokoli uprav, smaz, presun - i mezi repository.“, kde to bude a jak se to bude jmenovat, je mu jedno; a: „A nerozumim nekterym souborum, spotrebice.txt, forecast.md apod. Zjednodus to.“). `TYDEN.md` (historie týdnů, odpovědi uživatele, měření úspěšnosti, otázky tohoto týdne a v příloze ladění předpovědi výroby, dříve samostatný soubor FORECAST.md) je jen v `ha-config`, složka `energie/tyden/`; karty a kit ho nemají. Nemaže se, nekonsoliduje do `DESIGN_HISTORY.md` a týdenní analýza do něj přidává, nepřepisuje starší týdny. Denní součty a předpovědi proti skutečnosti jsou v `energie/tyden/data/` (`dny.csv`, `predpoved_dny.csv`, `predpoved/`), hodinové exporty v `energie/tyden/export/`. Token k Home Assistantu se do gitu neukládá. Pravidlo 2 platí dál pro otázky mimo týdenní ladění: neověřené se ptá v chatu.
12. **Tvrdé pravidlo: ve veřejných repozitářích (kit, Klima, Energie) jsou jen veřejné věci, soukromé jsou v `ha-config`** (uživatel 4. 11. 2026: „V dashboardu budou jen veřejné věci. Private budou v ha-config. Tvrdé pravidlo“). Soukromé je: obraz Home Assistantu (`ha/entities.json`) a `ENTITY_MAP.md`, konfigurace Home Assistantu (`yaml/`), hodinová data, týdenní ladění, skripty nad vlastním Home Assistantem, tokeny a osobní údaje (jména osob, VIN, GPS, MAC, lokální IP adresy, notifikační služby podle jmen). Veřejné je ID entit (například `sensor.goodwe_pv_power`) a jména místností v kartách, ve spec, v příkladech i v testech (uživatel 4. 11. 2026: „sensor.goodwe_pv_power je ok veřejný, jména místností nevadí“). Nová soukromá věc se zakládá rovnou v `ha-config`, ne ve veřejném repozitáři „zatím“. `check-docs` hlásí soukromé soubory a vzory údajů ve veřejném repozitáři jako chybu.

### Soubory v repozitáři karty

| Soubor | Co |
|---|---|
| `CLAUDE.md`, `AGENTS.md` | vstup pro Claude; omezení agentů a zdroje pro kartu |
| `CURRENT_SPEC.md` | chování a vzhled, jen rozhodnutí uživatele a ověřená fakta |
| `DESIGN_HISTORY.md` | historie, zamítnuté a nepotvrzené návrhy (nezávazné) |
| `README.md` | instalace, konfigurace |
| `.github/copilot-instructions.md` | pravidla kódu |

Kit má stejnou sadu a navíc `DASHBOARD_UX_SYSTEM.md`. `ENTITY_MAP.md` karty není v kartě, ale v `ha-config` (pravidlo 12). Jiné `.md` soubory se nezakládají.

### Soukromý repozitář `ha-config`

Soukromá data, která do veřejného kitu a karet nepatří (`CURRENT_SPEC.md` kitu: kit je veřejný a nemá osobní údaje z Home Assistantu). Obraz Home Assistantu, na který lze sáhnout: jeden soubor se všemi entitami, který vytváří jeden skript (`snapshot.py`, spouští se `snapshot.cmd`). Co kde je a co pustit: `README.md` v `ha-config`. `check-docs` tento repozitář nekontroluje, jen z něj čte obraz a kontroluje `ENTITY_MAP.md` jako součást karty.

| Cesta | Co |
|---|---|
| `README.md`, `CLAUDE.md` | co kde je, co pustit, token |
| `ha/entities.json` | obraz Home Assistantu: všechny entity (oblast, zařízení, integrace, štítky, jednotka, třída, možnosti), jedna na řádek, bez stavů a časů; generuje `snapshot.py`, ručně se needituje |
| `energie/ENTITY_MAP.md`, `klima/ENTITY_MAP.md` | mapa entit karty: jen entity potvrzené obrazem nebo výslovně uživatelem (oddíl „Potvrzeno uživatelem“) |
| `energie/tyden/` | `TYDEN.md` (pravidlo 11), skripty hodinového exportu a analýzy, `export/`, `data/` |
| `klima/hodiny/` | hodinový export Klimatu a jeho test |
| `yaml/` | konfigurace Home Assistantu (`automations.yaml`, `scripts.yaml`, `configuration.yaml`) |

## Kde co je (každá věc na jednom místě)

| Co | Kde |
|---|---|
| Agenti, společná pravidla, pravidla dokumentace, postup | kit: `.claude/agents/`, tento soubor |
| UX systém a společný vizuální a UI jazyk všech karet | kit: `DASHBOARD_UX_SYSTEM.md` |
| Společný kód a pravidla kódu | kit: `src/`, `CURRENT_SPEC.md` |
| Návod na připojení Claude k Home Assistantu | kit: `AI_MCP.md` |
| Omezení agentů a zdroje specifické pro kartu | `<karta>/AGENTS.md` |
| Chování a vzhled karty | `<karta>/CURRENT_SPEC.md` |
| Potvrzené entity | `ha-config/<karta>/ENTITY_MAP.md` (podle obrazu `ha-config/ha/entities.json`) |
| Obraz Home Assistantu, konfigurace Home Assistantu, hodinová data, týdenní ladění, skripty exportu, token | soukromý `ha-config` (viz oddíl Soukromý repozitář ha-config) |
| Historie, zamítnuté a nepotvrzené návrhy | `<repozitář>/DESIGN_HISTORY.md` |
| Otevřené otázky | chat s uživatelem, nikde v souboru |

## Zdroje pravdy v kartě

1. `CURRENT_SPEC.md`: chování a vzhled. Co uživatel nerozhodl, se nedomýšlí a nepíše, je to otázka v chatu.
2. `ENTITY_MAP.md` (v `ha-config/<karta>/`): potvrzené entity. Entita, která tu chybí, je nepotvrzená a nepoužívá se.
3. `DESIGN_HISTORY.md`: jen historie, spec nepřebíjí. Nepotvrzený návrh v ní není podklad.

## Společná omezení

- Zjednodušovat. Odstranění nebo sloučení je plnohodnotný výstup. Nový prvek musí něco nahradit nebo mít zdůvodněnou hodnotu.
- Číslo (práh, čas), které uživatel nerozhodl, je „návrh“ a jde jako otázka uživateli, ne jako pravidlo.
- Omezení jen pro jednu kartu (například „bez AI a Forecastu“ v Klimatu) jsou v `AGENTS.md` té karty a na druhou se nepřenášejí.

## Mezi kartami

- Obě karty mají jeden vizuální a UI jazyk (`DASHBOARD_UX_SYSTEM.md`, oddíl Vizuální a UI jazyk). Nová hodnota nebo styl je návrh na změnu společného jazyka, ne výjimka v jedné kartě.
- Návrh vzhledu nebo ovládání se posuzuje proti oběma kartám. Nový vzor musí zlepšit všechny dashboardy.
- Rozpor mezi kartami je nález a jde uživateli jako otázka, ne jako tichá úprava.
- Co by bylo ve dvou kartách stejné, patří do kitu (`CURRENT_SPEC.md`, Kam co patří). Agent to označí a nekopíruje.

## Úrovně signálů

| Úroveň | Co je to | Typ příkladu |
|---|---|---|
| L1 | Aktuální stav jedné entity | hodnota CO₂ nad mezí; baterie okna málo nabitá |
| L2 | Stav a doba trvání (`last_changed`, `for:`) | okno otevřené delší dobu |
| L3 | Více entit ve stejném okamžiku | okno zavřené a CO₂ vysoké; wallbox a bojler odebírají současně |
| L4+ | Časová řada, trend, rychlost změny, učení, přítomnost, předpověď | jen se souhlasem uživatele |

L4+ je ve výchozím stavu zakázané. Karta ho může povolit ve svém `AGENTS.md`. Export entit nemusí mít `last_changed`; L2 se pak v exportu ověřit nedá, v Home Assistantu existuje.

## Pravidla výstupu

- Česky. `entity_id`, názvy souborů a kódy (R1, KL12, N5, C15, K3) beze změny.
- Bez úvodu, rekapitulace zadání a závěrečného shrnutí. Fakta před zdvořilostí.
- Každé tvrzení o datech nese `entity_id` nebo soubor s oddílem. Co nejde doložit, je „nedoloženo“ a hlavní session z toho udělá otázku v chatu.
- Každá otázka a každý úkol pro uživatele nese štítek BLOCKER / HIGH / NORMAL / LOW (pravidlo 6 v oddílu Dokumentace).
- Poslední řádek výstupu: „Konflikty se spec: …“ nebo „Konflikty se spec: žádné“ (pravidlo 5 v oddílu Dokumentace).
- Agenti nic nezapisují a nepřidělují čísla (KL, N, C, E, K). Soubory mění hlavní session po souhlasu uživatele.
- Sdílené věci (agenti, UX systém, tento soubor) se mění jen v kitu.

## Postup

1. `klima-expert` nebo `energie-expert` (u změny pro obě karty oba): signály L1–L3, abnormality, akce uživatele.
2. `idea-generator` (volitelně): nejvýš 5 nápadů a návrhy na zjednodušení.
3. `ux-architect`: návrh jen z ověřených signálů.
4. `dashboard-critic`: dostane hotový návrh a odkazy na zdroje, ne zdůvodnění autorů.
5. Hlavní session spojí výsledky, ověří je proti spec (pravidlo 5), nesrovnalosti a vše nepotvrzené předá uživateli jako otázky v chatu a návrh i otázky zapíše do `DESIGN_HISTORY.md` jako nepotvrzené. Do spec jde až to, co uživatel potvrdí.
