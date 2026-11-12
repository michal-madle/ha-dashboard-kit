# CLAUDE.md

ha-dashboard-kit: společné stavební kameny karet Klima a Energie (knihovna, ne karta) a centrum agentů. Odpovídej česky.

@AGENTS.md

## Kde co je

- Kód a pravidla kódu kitu: `README.md`, `.github/copilot-instructions.md` a spec `ha-config/kit/CURRENT_SPEC.md`. Testy: `npm test`.
- Agenti: `.claude/agents/`. Společná pravidla: `AGENTS.md`. UX systém a společný vizuální a UI jazyk: `DASHBOARD_UX_SYSTEM.md`.
- Agenti a UX systém se mění jen tady, ne v kartách.
- Soukromá data (spec a historie kitu i karet, exporty entit, konfigurace Home Assistantu `yaml/`, hodinová data, týdenní ladění Energie) jsou v soukromém repozitáři `ha-config`; kit je veřejný a nic takového neobsahuje. Struktura: `README.md` v `ha-config`.
