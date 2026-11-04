# Claude a Home Assistant (MCP): návod

Jak připojit Claude k vašemu Home Assistantu (Core 2026.10.4, HAOS ve VirtualBoxu) tak, aby se dal ptát na energii, historii a aby šlo ladit automace a dashboardy. „MCP“ (Model Context Protocol) je standard, kterým Claude volá nástroje; Home Assistant je pro něj „server“.

Návod vychází z dokumentace k [MCP serveru v Home Assistantu](https://www.home-assistant.io/integrations/mcp_server), z projektu [ha-mcp](https://github.com/homeassistant-ai/ha-mcp) ([průvodce add-onem](https://homeassistant-ai.github.io/ha-mcp/guide-addon)), z integrací [Anthropic](https://home-assistant.io/integrations/anthropic) a [AI Task](https://www.home-assistant.io/integrations/ai_task/). Podrobnosti se v těchto projektech mění rychle; kde se liší, platí jejich dokumentace.

## Tři různé věci (nezaměňovat)

| | Kdo koho volá | K čemu | Potřebuje |
|---|---|---|---|
| **A. MCP server v Home Assistantu** (oficiální) | Claude → Home Assistant | ptát se a ovládat vystavené entity | internetově dostupný HTTPS (u claude.ai a Claude Desktop) |
| **B. ha-mcp** (komunitní) | Claude → Home Assistant | totéž + automace, dashboardy, historie, logy, zálohy, šablony | HACS nebo add-on, administrátorský účet |
| **C. Integrace Anthropic + AI Task** | Home Assistant → Claude | Claude uvnitř automací: denní souhrn, vysvětlení anomálie | API klíč s fakturací |

Pro „zeptej se domu“ a ladění stačí A nebo B. Pro denní souhrn senzorem je potřeba C. Dají se kombinovat.

## Který zvolit

| Chci | Použít |
|---|---|
| Rychle se ptát na stav a ovládat vystavené věci | **A** |
| Číst historii a statistiky, ladit automace, měnit dashboardy | **B** |
| Mluvit s Claude z iPhonu i mimo domov | A nebo B + přístup z internetu (Nabu Casa, Cloudflare Tunnel) |
| Mít Claude jen na počítači doma, bez zveřejnění | B a Claude Desktop přes `uvx fastmcp-remote` (viz B) |
| Souhrn dne jako senzor, push s vysvětlením | **C** |

## Společná příprava (5 minut)

1. **Vystavte jen to, co chcete.** Nastavení → Hlasoví asistenti → Vystavit. Pro A (a C) vidí Claude jen entity vystavené Assistu. Začněte senzory (`sensor.goodwe_*`, `sensor.master_*`, `sensor.wallbox_*`, `sensor.tuv_*`, auto) a **nevystavujte** hned spínače a čísla, kterými se mění nastavení (`switch.wallbox_4_…`, `number.goodwe_grid_export_limit`, `select.goodwe_inverter_operation_mode`). Ovládání přidáte později, až budete vědět, že to funguje.
2. **Záloha** (Nastavení → Systém → Zálohy), než cokoli z B dostane právo měnit konfiguraci.
3. **Samostatný administrátorský účet pro Claude** (např. `claude`), ne váš osobní. Jde ho kdykoli odebrat a v logu vidíte, co udělal.

## A. Oficiální MCP server v Home Assistantu

1. Nastavení → Zařízení a služby → Přidat integraci → **Model Context Protocol Server**.
2. Server běží na adrese `https://<váš-home-assistant>/api/mcp`. Přihlášení je přes OAuth 2.0 s PKCE (bez klientského tajemství). Volba „Vyžadovat účet správce“ je zapnutá ve výchozím stavu; nechte.
3. **Claude Code** (na počítači):
   ```bash
   claude mcp add --transport http home-assistant https://<váš-home-assistant>/api/mcp
   claude mcp login home-assistant
   ```
   Otevře se prohlížeč, přihlásíte se do Home Assistantu a povolíte. (Claude Code podle dokumentace čeká HTTPS; pro čisté `http://` v domácí síti použijte B.)
4. **claude.ai a Claude Desktop** (Nastavení → Konektory → Přidat vlastní konektor, adresa serveru jako výše): cloudové klienty volá Anthropic z internetu, takže Home Assistant musí být dostupný zvenku přes HTTPS (Home Assistant Cloud / Nabu Casa, nebo vlastní doména a reverzní proxy). Za proxy musí předávat hlavičky `X-Forwarded-Host` a `X-Forwarded-Proto`. Server nepodporuje dynamickou registraci klienta; jako ID klienta se použije základní adresa klienta (např. `https://claude.ai`).
5. Zkouška: „Vypiš, co teď teče z baterie, ze sítě a do auta.“ Claude použije nástroje Assistu (stav entit) a prostředek `homeassistant://assist/context-snapshot`.

Omezení: jen vystavené entity, bez historie a statistik, bez správy automací a dashboardů. Server také nepodporuje notifikace ani „sampling“.

## B. Komunitní ha-mcp (doporučeno pro vaše účely)

Umí hledat entity, volat služby, spravovat automace, skripty, scény, dashboardy, pomocníky, oblasti, číst **historii, statistiky, logy, stopy automací**, vyhodnocovat šablony Jinja, dělat zálohy a kontrolovat aktualizace. Právě šablony a statistiky potřebujete na ptaní typu „kolik energie router nasměroval v týdnu“.

Vyberte **jednu** instalaci (nemíchat u jednoho klienta):

**B1. HACS (doporučeno)**: vyžaduje administrátorský token nebo samostatný účet (viz Společná příprava); postup je v [README projektu](https://github.com/homeassistant-ai/ha-mcp).

**B2. Add-on (HAOS)**:
1. Nastavení → Doplňky (Aplikace) → Obchod → ⋮ → Repozitáře → přidat `https://github.com/homeassistant-ai/ha-mcp`.
2. Nainstalovat, spustit; v logu najděte řádek `MCP Server URL: http://<ip>:9583/private_<tajný-řetězec>`. **Ta adresa je heslo**: kdo ji zná, ovládá server. Nesdílejte ji, nevkládejte do repozitáře.
3. Do nastavení add-onu nedávejte `HOMEASSISTANT_URL` ani token (add-on je má sám).

Připojení klienta (přenos je Streamable HTTP, **ne SSE**; konfigurace SSE vrátí chybu 405):

- **Claude Desktop na počítači v domácí síti** (bez zveřejnění): nainstalujte `uv` (macOS/Linux `curl -LsSf https://astral.sh/uv/install.sh | sh`, Windows `winget install --id=astral-sh.uv -e`) a do `claude_desktop_config.json`:
  ```json
  {
    "mcpServers": {
      "home-assistant": {
        "command": "uvx",
        "args": ["fastmcp-remote", "http://<ip-home-assistantu>:9583/private_<tajný-řetězec>"]
      }
    }
  }
  ```
  Restartujte Claude Desktop.
- **Claude Code**: `claude mcp add --transport http home-assistant <adresa>`. (Pokud by Claude Code odmítl `http://`, použijte `uvx fastmcp-remote` jako stdio příkaz.)
- **claude.ai z telefonu**: potřebuje veřejnou HTTPS adresu: Cloudflare Tunnel, Nabu Casa nebo Webhook Proxy; průvodce [Setup Wizard](https://homeassistant-ai.github.io/ha-mcp/setup) vybere variantu.

Zabezpečení v ha-mcp (zapněte všechno, co jde): režim jen pro čtení (**Read Only Mode**) na začátek, vypínání jednotlivých nástrojů, schvalování nástrojů, automatické zálohy před úpravou, samostatný účet místo osobního tokenu.

## C. Claude uvnitř Home Assistantu (souhrn dne, vysvětlení anomálie)

1. Na console.anthropic.com vytvořte API klíč (potřebuje kredit; MCP přes předplatné Claude se tím nefakturuje, API ano).
2. Nastavení → Zařízení a služby → Přidat integraci → **Anthropic**, vložit klíč. Vzniknou entity `conversation` a `ai_task` (název závisí na vaší instalaci, najdete v Nástroje pro vývojáře → Stavy: filtr `ai_task`).
3. Příklad: denní souhrn jako senzor (dejte do `configuration.yaml` nebo balíčku; entity nahraďte podle `examples/energie.yaml` a `examples/denni_soucty.yaml`):

```yaml
template:
  - triggers:
      - trigger: time
        at: "21:30:00"
    actions:
      - action: ai_task.generate_data
        data:
          task_name: Denní energetický souhrn
          entity_id: ai_task.claude_ai_task   # nahradit skutečnou entitou
          instructions: >
            Jsi energetický poradce domácnosti s FVE, baterií GoodWe, wallboxem
            a bojlerem na AZ Routeru. Napiš česky tři věty (max. 300 znaků):
            co se dnes povedlo, co bylo nezvyklé a jeden konkrétní tip na zítra.
            Čísla: výroba {{ states('sensor.energie_fve_dnes') }} kWh,
            odběr ze sítě {{ states('sensor.energie_sit_odber_dnes') }} kWh,
            dodávka do sítě {{ states('sensor.energie_sit_dodavka_dnes') }} kWh,
            baterie nabito {{ states('sensor.energie_baterie_nabito_dnes') }} kWh,
            vybito {{ states('sensor.energie_baterie_vybito_dnes') }} kWh,
            router nasměroval dnes {{ states('sensor.master_saved_energy_today') }} kWh,
            auto SoC {{ states('sensor.parkovani_bmw_i3_soc') }} %.
        response_variable: souhrn
    sensor:
      - name: Energie souhrn dne
        unique_id: energie_souhrn_dne
        state: "{{ now().isoformat() }}"
        attributes:
          text: "{{ souhrn.data }}"
```

Stav senzoru smí mít nejvýše 255 znaků, proto je text v atributu `text`. Odeslání na iPhone: v automaci přidejte akci `notify.mobile_app_<váš_telefon>` se zprávou `{{ state_attr('sensor.energie_souhrn_dne', 'text') }}`.

Pro `ai_task` jde i strukturovaný výstup (pole `structure`), třeba `{skore: 0–100, tip: text}`, a přílohy (snímek dashboardu). Podrobnosti v [dokumentaci AI Task](https://www.home-assistant.io/integrations/ai_task/).

## Co se ptát (aby to mělo smysl)

- „Kolik jsem tento týden vyrobil, spotřeboval, dodal a odebral? Spočítej soběstačnost.“
- „Kdy dnes přestala baterie nabíjet a proč?“
- „Byl dnes odběr z baterie do auta nebo bojleru? Kolik kWh?“
- „Porovnej `pv1` a `pv2` za posledních 14 dní. Je mezi nimi nezvyklý poměr?“
- „Který článek baterie byl za poslední měsíc nejčastěji nejslabší?“
- „Napiš automaci, která pošle push, když baterie vybíjí a auto nabíjí déle než 5 minut.“ (B vytvoří automaci až po vašem schválení.)

## Bezpečnost a rozumné meze

- MCP klient s právem měnit konfiguraci může smazat nebo rozbít automace. Začněte **jen pro čtení**, potom povolujte po jednom.
- Neotevírejte Home Assistant do internetu přes přesměrování portu. Nabu Casa nebo Cloudflare Tunnel s přihlášením jsou bezpečnější.
- Adresa s tajným řetězcem v B2 je přihlašovací údaj. Pokud unikne, přeinstalujte add-on (vygeneruje nový).
- Do Claude se posílají čísla ze senzorů (výroba, spotřeba) a stavy zařízení. Pozor na polohu (`device_tracker.i3_120`) a VIN v názvech entit; nevystavujte je.
- Nastavení tohoto repozitáře ani karty se tím nemění; jde o samostatnou vrstvu nad stejnými daty.

## Zdroje

- [MCP Server – Home Assistant](https://www.home-assistant.io/integrations/mcp_server)
- [ha-mcp](https://github.com/homeassistant-ai/ha-mcp), [průvodce add-onem](https://homeassistant-ai.github.io/ha-mcp/guide-addon), [Setup Wizard](https://homeassistant-ai.github.io/ha-mcp/setup)
- [Anthropic – Home Assistant](https://home-assistant.io/integrations/anthropic)
- [AI Task – Home Assistant](https://www.home-assistant.io/integrations/ai_task/)
