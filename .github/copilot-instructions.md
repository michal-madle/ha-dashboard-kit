# Copilot Instructions

## Project scope and sources of truth

- This repository is `ha-dashboard-kit`: the shared building blocks of two Home Assistant Lovelace custom cards, `ha-klima-dashboard` and `ha-energie-dashboard`. It is not a card, not a Home Assistant integration and has no build; it ships TypeScript sources (and a few `.mjs` tools) that the cards bundle into their own file.
- Read `CURRENT_SPEC.md` first: it holds the decisions of the user and the rule for what belongs here ("Kam co patří") with the map of modules. `README.md` shows how a card uses the kit; `TODO.md` lists candidates to move from the cards.
- What belongs in the kit: code and rules that both cards share and that do not depend on a card's entities, texts, colours or layout. What does not: texts for the user, entity IDs, card names, card colours. Never copy kit code into a card "for now"; move it here first.
- Do not invent Home Assistant behaviour, entity IDs, units or signs. The repository is public: never commit personal data from Home Assistant.

## Conventions

- Strict TypeScript (Lit 3 for controls, `experimentalDecorators`); the tooling in `build/` and `testing/` is plain `.mjs` with a hand-written `.d.mts`, because Vite config and Playwright do not transpile TypeScript from `node_modules`.
- Public API = the `exports` of `package.json` (CURRENT_SPEC.md, Mapa modulů). A rename of an export, event, property or CSS variable is a breaking change (MAJOR); both cards are rewritten in the same round.
- Controls take their colours from `--hdk-*` variables with dark defaults; they register under the prefix of the card (`defineControls("ed")`). Protected controls never move or resize anything for a hint or popup.
- Every change: `CURRENT_SPEC.md` and `README.md` if the rule or API changes → implementation → tests → `npm test` → commit in Czech without diacritics → tag `vX.Y.Z` when cards should pick it up → push to `main`. End commit messages with the attribution lines of the session. Report nothing as passing that was not run.
