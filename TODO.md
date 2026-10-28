# TODO – ha-dashboard-kit

Otevřené věci a kandidáti na přesun z karet do kitu. Hotové se mažou, čísla se nepoužívají znovu.

- **K1. Posuvník Klima.** Klima má vlastní posuvník (časovač, cíl teploty) v hlavním souboru a ve stylech. `HdkSlider` je ekvivalent podle HIG; sjednotit vzhled a přepnout Klima na něj (bez změny chování, testy Klima musí zůstat zelené).
- **K2. Nápověda u předvoleb žaluzií v Klimatu.** Gesto (`HoldOrDoubleTap`) už Klima z kitu používá; zbývá zvážit, zda i nápověda u tlačítka (`.preset-hint`) nemá používat `HintState` a `hintStyles`.
- **K3. Barvy a povrchy podle HIG.** Obě karty mají tmavou a světlou sadu povrchů (`--ed-*`, `--kd-*`) se stejnými hodnotami Apple HIG. Společná sada `--hdk-*` s mapováním karet by odstranila kopie; rozhodnout, zda jsou hodnoty opravdu totožné.
- **K4. Souhrnný test stylu textů.** Kontrola „v en a sv není český text“ je zkopírovaná v testech obou karet; nabídnout ji jako pomocnou funkci `testing/` (potřebuje, aby karta řekla, kde je její text).
- **K5. Soubory pro pokyny agentů.** Pokyny (`.github/copilot-instructions.md`) obou karet se opakují v částech o konfiguraci, jazycích a ověřování; společné části by měly žít jen v kitu a v kartách zůstat odkaz.
