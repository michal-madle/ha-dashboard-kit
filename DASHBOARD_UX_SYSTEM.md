# Dashboard UX System

Applies to all dashboards.

Source of truth:
- Apple Human Interface Guidelines
- Dashboard Kit
- Shared UX patterns across all dashboards

Principles:

- Show abnormalities before normal states.
- Information hierarchy must be obvious within 2 seconds.
- Mobile first.
- Touch first.
- Details belong behind tap.
- Use color only when it carries meaning.
- Keep interaction patterns identical across dashboards.
- Prefer insights over raw sensor values.
- Prefer recommendations over diagnostics.
- Consistency is more important than local optimization.
- New patterns must improve all dashboards, not only one.

Review criteria:

- Clarity
- Information hierarchy
- Abnormality detection
- Actionability
- Consistency
- Apple HIG compliance

## Vizuální a UI jazyk

Společný pro všechny karty (Klima, Energie) a jediný zdroj vzhledu. Karta k němu přidává jen to, co je specifické pro její data (barvy zdrojů, diagram, řádky místností). Při rozporu platí tento dokument. Přesunuto 2. 11. 2026 ze `CURRENT_SPEC.md` karty Energie (oddíl Vzhled podle Apple HIG) beze změn významu.

Rozhodnutí uživatele 27. 10. 2026: „Použij Apple guidelines. Všude, na všech kartách. Důležité, uprav spec. Ne Liquid Glass, ale“ [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) (segmented controls, toggles, sliders atd.). Z HIG jsem přečetl stránky Segmented controls, Toggles, Sliders, Buttons, Lists and tables, Typography, Color, Dark Mode a Materials (stav 27. 10. 2026); čísla níže jsou buď z HIG (označeno „HIG“), nebo rozhodnutí návrhu (označeno „návrh“) či uživatele.

**Princip.** Karta vypadá jako standardní iOS v tmavém i světlém režimu: ploché povrchy ze systémových barev, písmo SF Pro v obvyklých textových stylech, standardní ovladače. Žádný Liquid Glass: HIG (Materials) říká „Don’t use Liquid Glass in the content layer“ a používat ho „sparingly“; obsah karty je obsahová vrstva, takže bez rozmazání pozadí, bez lesku a odlesku, bez světelných okrajů. Dlaždice, karty a skupiny nemají stín; jezdce ovladačů mají bílou výplň a jemný stín. (HIG dovoluje u jezdce posuvníku a přepínače skleněný vzhled při dotyku; zatím se nepoužívá.) Karta stojí v `ha-card`, povrchy kreslí sama.

**Pravidlo pro kolečka a měřiče s číslem** (uživatel 30. 10.: „Číslo musí být uprostřed. To je základní pravidlo. A jednotka menší pod value.“): hodnota je vždy uprostřed kolečka vodorovně i svisle, jednotka je menší (a šedá) přímo pod číslem, ne vedle něj. Žádné slovo navíc v kolečku („hotovo“ apod.). Platí pro všechny karty. Kolečko je společný prvek kitu (`<předpona>-ring`, `CURRENT_SPEC.md` kitu, Ovládací prvky); karta mu dá jen barvu výplně, číslo a název pro čtečku.

**Pravidlo pro číslo a jednotku v dlaždici** (uživatel 3. 11. 2026: „Beru variantu C“, „Ano změn všude“): v dlaždici s hodnotou je číslo 17 px tučně (Body) a jednotka vedle něj 12 px (Caption 1) v tlumené barvě textu (90 % krytí v tmavém, 65 % ve světlém režimu; na sytých dlaždicích je sekundární šedá pod 4,5 : 1), v jednom řádku s mezerou (v Energii „1,37 kW“, „630 W“). Stav bez hodnoty (slovo) má běžný řez. Čtečka dostane celý text hodnoty.

**Grafy** (uživatel 4. 11. 2026: „Tyhle grafy bez vodících čar, bez os atd jsou nesmyslné. Jsou na hodně místech. Změn si spec - na šířku okna musí být 6-10 dělení. na výšku musí být cca ve stejném rastru. Změň to všude.“): každý graf s vlastním oknem a časovou osou (detail, popup, rozbalený řádek) má **svislé vodicí čáry, které dělí šířku na 6 až 10 dílů** s časem pod každou čárou (hodina, zkratka dne nebo den a měsíc; kulatý krok: u 24 h po 3 h, u 12 h po 2 h, u 6 h po 1 h, u 7 dní po dni, u 30 dní po 5 dnech; u nejhustších os každý druhý popisek; čára přímo na okraji grafu popisek nemá). **Vodorovné čáry mají přibližně stejnou vzdálenost jako svislé**, takže buňky mřížky jsou zhruba čtvercové; hodnoty jsou ve vlastním pruhu **vpravo za grafem** (12 px, sekundární barva, svisle na čáře, nikdy přes data; uživatel 4. 11.: „udělej to aby to bylo čitelné a všude stejné“) a čáry leží na kulatých hodnotách (mezi dvěma hlavními čárami 2, 4 nebo 5 dílů, nikdy 12,5 z 50); časové popisky jsou celé hodiny bez minut („18“, 12hodinový čas „6 PM“), jednotka veličiny je v nadpisu grafu nebo u horní hodnoty. Čáry jsou jemné (barva `--bar`, 1 px) a nulová nebo základní osa je výraznější. Malé čáry v řádcích bez vlastního okna (mikrotrendy v hlavní kartě Klimatu) tímto pravidlem nejsou (uživatel 4. 11.: „mikrotrendy bez osy jsou správně“).

**Povrchy (tmavý režim, HIG iOS grouped backgrounds).** Podklad stránky `#000000` (systemGroupedBackground); karta a skupina řádků `#1C1C1E` (secondarySystemGroupedBackground); prvek uvnitř skupiny, dlaždice diagramu, stopa ovladače a podklad měřiče `#2C2C2E` (tertiarySystemGroupedBackground); oddělovač `rgba(84,84,88,.65)`; bez okrajů kolem karet. Světlý režim: `#F2F2F7`, `#FFFFFF`, `#F2F2F7` (tertiary) a oddělovač `rgba(60,60,67,.29)`. Poloměr karty a skupiny 12 px, dlaždice diagramu 12 px, ovladače jsou kapsle (poloměr plný, rozhodnutí uživatele 27. 10.: „Chci tu kapsli. Všude. Na slideru i radiobuttony“). Karta kreslí tyto povrchy sama (ne z motivu Home Assistantu), jen přepíná tmavý/světlý podle Home Assistantu; vlastní nastavení vzhledu karta nemá (HIG Dark Mode: „Avoid offering an app-specific appearance setting“). Při zapnutém zvýšeném kontrastu (`prefers-contrast: more`) se oddělovače a obrysy zesílí a barvy nahradí „accessible“ varianty systémových barev (implementace s kódem).

**Text (HIG Color, Dark Mode).** Hlavní text `#FFFFFF` (světlý `#000000`), vedlejší `#98989F` (≈ secondaryLabel; světlý `rgba(60,60,67,.6)`), bez dat (ikona i „––“) `#8E8E93` (světlý `#6E6E73`). Kontrast textu aspoň 4,5 : 1, u malého textu snaha o 7 : 1 (HIG); měřeno: bílá na `#1C1C1E` 17 : 1, `#98989F` na `#1C1C1E` 5,9 : 1. Barva sama nenese význam (HIG Inclusive color): stav je vždy i slovem nebo ikonou, ne jen barvou.

**Písmo (HIG Typography, iOS).** Systémové písmo (`-apple-system, "SF Pro", Inter, Roboto`), tabulkové číslice. Jen tyto styly: Title 1 28/34 (velká čísla), Title 2 22/28 (název karty), Body 17/22 (název řádku, popisek ovladače, text tlačítka), Subhead 15/20 (vedlejší text, hodnoty), Footnote 13/18 (popisky pod ovladači, osy a popisky v grafech; uživatel 25. 10.: popisky v grafech aspoň 13 px, malé jsou nečitelné), Caption 1 12/16 (jen názvy dlaždic a pomocné popisky; HIG minimum je 11 pt). Výjimka: hero čísla (například v Energii nabití auta 52 px, teploty nádrží 32 px).

**Barvy.** Akcent ovladačů je systemBlue `#0A84FF` (výplň posuvníku, zapnutý přepínač). Primární tlačítko má výplň `#0A6ED1` s bílým popiskem (kontrast 5,0 : 1; čistá modrá s bílým textem měla 3,7 : 1). Odchylka (upozornění) je systemOrange `#FF9230`, destruktivní akce systemRed `#FF4245` (v kartě zatím není).

### Ovládací prvky

Rozměry, události a chráněné ovládání jsou v [CURRENT_SPEC.md](./CURRENT_SPEC.md) (oddíly Ovládací prvky a Chráněné ovládání) a v kódu kitu. Pravidla použití jsou níže; příklady a odkazy na oddíly (Teplá voda) jsou z karty Energie.

**Přepínač (HIG Toggles).** Jen v řádku seznamu, bez vlastního popisku (řádek je popisek). Šířka 60 × výška 32 px, podlouhlý bílý jezdec 40 × 26 px (přání uživatele 27. 10.: „Chci podlouhlý … a ne ta kulička“); vypnuto: stopa `rgba(120,120,128,.36)`, jezdec vlevo; zapnuto: stopa akcent, jezdec vpravo. Stav je i textem ve druhém řádku („Vypnuto“, při zapnutí popis toho, co se děje, viz Popisky stavu ovládání v `CURRENT_SPEC.md` Energie), ne jen polohou a barvou. Dotyková plocha aspoň 44 px (neviditelné rozšíření).

**Segmentový ovladač (HIG Segmented controls).** Dvě až pět položek stejné šířky, popisky podstatná jména, text, ne text s ikonou. Používá se jen pro volbu režimu nebo pohledu (Přetoky | Boost u auta, Auto | Manual | Off, Dnes | 7 dní), ne pro akci; tak jsou řešeny režim wallboxu a režim zásobníku; Boost bojleru a Mísení vody jsou přepínače (viz Teplá voda v `CURRENT_SPEC.md` Energie). U dvojic, kde je zapnutí opatrná volba (Přetoky | Boost u auta), je vlevo vždy klidný stav a vpravo aktivní; u přepínačů je vypnuto vlevo, zapnuto vpravo (uživatel 27. 10.: „Potřebuji mít konzistentní, že vlevo je vypnuté mísení a vpravo zapnuté“). Názvy režimů se píší s velkým písmenem (Boost, Přetoky). Vzhled: stopa `#2C2C2E` ve tvaru kapsle, výška 48 px (položka se dvěma řádky, např. „Přetoky 60 °C“, 66 px), vybraná položka je bílý jezdec s černým popiskem (jezdec 3 px od okraje, posun 0,28 s, bez pohybu při `prefers-reduced-motion`). Nevybrané popisky `#EBEBF5`. Role `radiogroup`, šipky mění volbu, prvky aspoň 44 px.

**Posuvník (HIG Sliders).** Jeden styl všude; nesmí být citlivý (uživatel). Minimum vlevo, maximum vpravo; zvolená hodnota velkým číslem nad ovladačem a krajní hodnoty pod ním. Vzhled: kapsle výšky 52 px se stopou `#2C2C2E`, v ní tenká lišta 6 px vyplněná akcentem po jezdec, podlouhlý bílý jezdec 38 × 24 px (podle uživatelova snímku z iOS 27); dílky po krocích pod lištou, aby se kroky 5 °C a 5 % daly najít (HIG zmiňuje dílky u macOS, v iOS jsou jen koncové body; ponecháno z designových důvodů). Kroky: 5 °C, 5 %, výkon nabíjení po 0,3 kW (Energie). Neexistuje „text + stepper“ varianta (HIG ji jen doporučuje u širokého rozsahu); hodnota se mění jen jezdcem a klávesnicí (šipky); dotyková plocha aspoň 44 px.

### Tlačítka a seznamy

**Tlačítka (HIG Buttons).** Dotyková plocha aspoň 44 × 44 px; popisek sloveso (Hotovo, Přepnout, Zrušit). Role: normální = výplň `rgba(118,118,128,.24)`, bílý popisek 17 px; primární = výplň `#0A6ED1`, bílý popisek polotučný; zrušit = jako normální; destruktivní = červená a nikdy primární. Nejvýše jedno nebo dvě prominentní tlačítka na pohled. Tlačítko má stav stisknuto (tmavší výplň). Tlačítko, které se chová jako přepínač (například chip v simulaci Energie), je zapnuté výplní `#0A6ED1`, vypnuté šedě.

**Seznam (HIG Lists and tables, inset grouped).** Skupina řádků na `#1C1C1E` s poloměrem 12 px, mezi řádky oddělovač; řádek: ikona 24 px v podkladu 40 × 40 px, název Body 17, pod ním vedlejší text 13–15, vpravo ovladač, hodnota nebo chevron „›“ (chevron = přechod do detailu, ne tlačítko „info“); text řádků stručný; řádky aspoň 44 px (v kartě 60–64 px kvůli dvěma řádkům textu). Řádky všech karet mají stejnou mřížku (ikona | název, pod ním stav | doplněk vpravo). Popisek skupiny nad ní: Footnote 13, vedlejší barva.

### Rozdíly dnešních karet od společného jazyka

| Oblast | Společný jazyk | Klima dnes (`CURRENT_SPEC.md`, Barvy) |
|---|---|---|
| Odchylka (oranžová) | `#FF9230` | `#FF9F0A` |
| Kritické (červená) | `#FF4245` | `#FF453A` (v popupu `#FF6961`) |
| Vedlejší text, tmavý režim | `#98989F` | `#9A9AA0` |
| Povrchy, tmavý režim | stránka `#000000`, karta `#1C1C1E`, prvek `#2C2C2E` | karta `#1C1C1E` s přechodem od `#232326` |
| Nastavení vzhledu | žádné vlastní, podle Home Assistantu | klíč `theme`: `auto`, `dark`, `light` |

Co se z toho změní, rozhodne uživatel; do té doby platí hodnoty v tabulce.
