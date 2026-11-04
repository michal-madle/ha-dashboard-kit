#!/usr/bin/env node
// Kontrola dokumentace repozitáře (pravidla: AGENTS.md kitu, oddíl Dokumentace).
// Použití: node tools/check-docs.mjs [--ha-config <adresář>] <adresář repozitáře> [další adresáře …]
// Kontroluje: zakázané a neznámé .md soubory, povinné soubory, značky nepotvrzeného
// ve spec / mapě entit / README, odkazy mezi soubory (včetně kotev) a entity ve spec,
// mapě a příkladech, které nejsou v žádném exportu `<ha-config>/<karta>/entity/*.json`.
// Soukromý repozitář `ha-config` se hledá vedle kontrolovaného repozitáře (nebo `--ha-config`,
// nebo proměnná HA_CONFIG); karta `ha-<karta>-dashboard` má exporty ve složce `<karta>/entity/`.
// `ENTITY_MAP.md` karty je v `ha-config` (`<karta>/entity/ENTITY_MAP.md`) a kontroluje se jako součást karty.
// Tvrdé pravidlo (AGENTS.md kitu, pravidlo 12): veřejné repozitáře obsahují jen veřejné věci. Kontrola hlásí
// soukromé soubory (mapa entit, exporty, konfigurace HA, tokeny, týdenní ladění) a soukromé údaje v textu
// (lokální IP adresy, tokeny JWT, VIN, notifikační služby podle jmen).
// Nenahrazuje čtení: jen hlídá to, co jde zkontrolovat strojově.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const FORBIDDEN = ["TODO.md", "AUDIT.md", "IDEAS.md", "MEMORY_SUMMARIZED.md"];
const ALLOWED = new Set([
  "CLAUDE.md", "AGENTS.md", "CURRENT_SPEC.md", "DESIGN_HISTORY.md", "README.md",
  "DASHBOARD_UX_SYSTEM.md", "AI_MCP.md", ".github/copilot-instructions.md",
]);
const IGNORED_DIRS = ["node_modules", ".git", "dist", "test-results", "playwright-report", ".claude/agents"];
const IGNORED_FILES = new Set();
// Soubory, ve kterých nesmí být žádná značka nepotvrzeného (pravidlo 1).
const STRICT = ["CURRENT_SPEC.md", "README.md", "DASHBOARD_UX_SYSTEM.md"];
// Soukromé věci (pravidlo 12): v kitu a kartách nesmí být. Patří do `ha-config`.
const PRIVATE_FILES = new Set([
  "ENTITY_MAP.md", "TYDEN.md", "FORECAST.md", "token.txt", "tokens.txt", ".env",
  "automations.yaml", "scripts.yaml", "configuration.yaml", "secrets.yaml",
]);
const PRIVATE_DIRS = ["HA entities", "HA config"];
const PRIVATE_PATTERNS = [
  [/(?<![\d.])(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(?![\d.]*\d)/, "lokální IP adresa"],
  [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./, "token JWT"],
  [/(?<![A-Za-z0-9])(?=[A-HJ-NPR-Z0-9]*\d[A-HJ-NPR-Z0-9]*\d[A-HJ-NPR-Z0-9]*\d)[A-HJ-NPR-Z0-9]{17}(?![A-Za-z0-9])/i, "VIN (sériové číslo vozidla)"],
  [/notify\.mobile_app_[a-z0-9]+_[a-z0-9_]+/i, "notifikační služba podle jména osoby"],
];
const SCANNED_EXT = /\.(md|ya?ml|json|ts|mjs|js|py|html|css|txt|csv|jinja|cmd)$/i;
const MARKERS = [
  /\bTODO\b/, /\bAUDIT\.md/, /\bIDEAS\.md/, /MEMORY_SUMMARIZED/, /VENTILATION_CONCEPT/,
  /k ověření/i, /nedolož/i, /nepotvrzen/i, /čeká na (potvrzení|rozhodnutí|vaši odpověď)/i,
  /\b(je|jsou) (moje |můj )?návrh\b/i, /\(návrh\b/i, /moje rozhodnutí|rozhodl jsem sám|je to moje|je moje\b/i,
];
const DOMAINS = [
  "sensor", "binary_sensor", "switch", "number", "select", "button", "climate", "cover", "water_heater", "vacuum",
  "update", "input_boolean", "input_number", "input_select", "input_datetime", "input_text", "script", "automation",
  "weather", "image", "device_tracker", "time", "light", "fan", "lock", "counter", "timer", "person", "scene",
];
const NOT_ENTITY = /^(set_\w+|turn_on|turn_off|toggle|get_forecasts|set_value|set_temperature|py|ts|js|json|yaml|yml|md|jinja|csv)$/;
const ENTITY_RE = new RegExp(`(?<![\\w.])(${DOMAINS.join("|")})\\.([a-z0-9_]+)(?![\\w*<{…])`, "g");

const errors = [];
const warnings = [];
const err = (repo, file, line, msg) => errors.push(`${basename(repo)}/${file}${line ? ":" + line : ""}: ${msg}`);

function walk(dir, root, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).split("\\").join("/");
    if (IGNORED_DIRS.some((d) => rel === d || rel.startsWith(d + "/"))) continue;
    if (statSync(full).isDirectory()) walk(full, root, out);
    else out.push(rel);
  }
  return out;
}

function slug(heading) {
  return heading.toLowerCase().replace(/[`*_~[\]()]/g, "").trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
}

function anchors(text) {
  const set = new Set();
  for (const m of text.matchAll(/^#{1,6}\s+(.+)$/gm)) set.add(slug(m[1]));
  for (const m of text.matchAll(/<a\s+id="([^"]+)"/g)) set.add(m[1]);
  return set;
}

// Soukromý repozitář s exporty entit (pravidla: AGENTS.md kitu, oddíl Soukromý repozitář ha-config).
let haConfigArg = process.env.HA_CONFIG || "";
const haConfigDir = (repo) => (haConfigArg ? resolve(haConfigArg) : join(dirname(repo), "ha-config"));
const cardKey = (repo) => basename(repo).replace(/^ha-(.+)-dashboard$/, "$1");

function loadEntities(repo) {
  const ids = new Set();
  const dir = join(haConfigDir(repo), cardKey(repo), "entity");
  if (!existsSync(dir)) {
    err(repo, "ENTITY_MAP.md", 0, `export entit nenalezen v ${dir} (repozitář ha-config musí být vedle karty, nebo zadejte --ha-config)`);
    return ids;
  }
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      for (const r of JSON.parse(readFileSync(join(dir, f), "utf8"))) if (r.entity) ids.add(r.entity);
    } catch (e) {
      err(repo, `ha-config/${cardKey(repo)}/entity/${f}`, 0, `export není platný JSON (${e.message})`);
    }
  }
  // Entity potvrzené přímo uživatelem (mimo export): oddíl „## Potvrzeno uživatelem …“ v ENTITY_MAP.md.
  const map = join(dir, "ENTITY_MAP.md");
  if (existsSync(map)) {
    const m = readFileSync(map, "utf8").match(/^## Potvrzeno uživatelem[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
    if (m) for (const e of m[1].matchAll(/`([a-z_]+\.[a-z0-9_]+)`/g)) ids.add(e[1]);
  }
  return ids;
}

// Tvrdé pravidlo (pravidlo 12): ve veřejném repozitáři jsou jen veřejné věci.
function checkPrivate(repo) {
  const reported = new Set();
  for (const rel of walk(repo, repo)) {
    const parts = rel.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      if (PRIVATE_DIRS.includes(parts[i]) && !reported.has(parts.slice(0, i + 1).join("/"))) {
        reported.add(parts.slice(0, i + 1).join("/"));
        err(repo, parts.slice(0, i + 1).join("/"), 0, "soukromá složka ve veřejném repozitáři (patří do ha-config, pravidlo 12)");
      }
    }
    if (PRIVATE_FILES.has(parts[parts.length - 1])) {
      err(repo, rel, 0, "soukromý soubor ve veřejném repozitáři (patří do ha-config, pravidlo 12)");
      continue;
    }
    if (!SCANNED_EXT.test(rel) || basename(rel) === "package-lock.json" || /^ha-.+-dashboard\.js$/.test(rel)) continue;
    readFileSync(join(repo, rel), "utf8").split("\n").forEach((l, i) => {
      for (const [re, what] of PRIVATE_PATTERNS) if (re.test(l)) err(repo, rel, i + 1, `${what} ve veřejném repozitáři (patří do ha-config, pravidlo 12)`);
    });
  }
}

function check(repoArg) {
  const repo = resolve(repoArg);
  const isCard = /^ha-.+-dashboard$/.test(basename(repo));
  const mapPath = join(haConfigDir(repo), cardKey(repo), "entity", "ENTITY_MAP.md");
  const mapRel = relative(repo, mapPath).split("\\").join("/");
  const files = walk(repo, repo).filter((f) => f.endsWith(".md") && !IGNORED_FILES.has(f));
  const siblings = ["ha-dashboard-kit", "ha-klima-dashboard", "ha-energie-dashboard"].map((n) => join(dirname(repo), n));
  // .md soubory soukromého repozitáře (TYDEN.md, FORECAST.md …): smí se na ně odkazovat jménem
  const hc = haConfigDir(repo);
  const hcNames = new Set(existsSync(hc) ? walk(hc, hc).filter((f) => f.endsWith(".md")).map((f) => basename(f)) : []);

  for (const req of ["CLAUDE.md", "AGENTS.md", "CURRENT_SPEC.md", "DESIGN_HISTORY.md"]) {
    if (!existsSync(join(repo, req))) err(repo, req, 0, "povinný soubor chybí");
  }
  if (isCard && !existsSync(mapPath)) err(repo, "ENTITY_MAP.md", 0, `povinný soubor chybí v ${mapPath} (ha-config musí být vedle karty, nebo zadejte --ha-config)`);
  for (const f of files) {
    if (PRIVATE_FILES.has(basename(f))) continue; // hlásí kontrola soukromých věcí níže
    if (FORBIDDEN.includes(basename(f))) err(repo, f, 0, "zakázaný soubor (otevřené otázky jdou do chatu, ne do souboru)");
    else if (!ALLOWED.has(f)) err(repo, f, 0, "neznámý .md soubor (povolené jsou jen soubory z AGENTS.md kitu, oddíl Dokumentace)");
  }
  checkPrivate(repo);

  const exported = isCard ? loadEntities(repo) : new Set();
  const texts = new Map(files.filter((f) => !PRIVATE_FILES.has(basename(f))).map((f) => [f, readFileSync(join(repo, f), "utf8")]));
  if (isCard && existsSync(mapPath)) texts.set(mapRel, readFileSync(mapPath, "utf8")); // mapa entit je v ha-config
  const isMap = (f) => f === mapRel;
  for (const [f, text] of texts) {
    const lines = text.split("\n");
    if (f !== "DESIGN_HISTORY.md") {
      // odkazy mezi soubory
      lines.forEach((l, i) => {
        for (const m of l.matchAll(/\]\((?!https?:|mailto:)([^)\s#]*)(#[^)\s]+)?\)/g)) {
          const target = m[1] ? resolve(join(repo, dirname(f)), decodeURIComponent(m[1])) : join(repo, f);
          if (!existsSync(target)) { err(repo, f, i + 1, `odkaz na neexistující soubor ${m[1]}`); continue; }
          if (m[2] && target.endsWith(".md") && !anchors(readFileSync(target, "utf8")).has(m[2].slice(1))) {
            err(repo, f, i + 1, `odkaz na neexistující kotvu ${m[1]}${m[2]}`);
          }
        }
        for (const m of l.matchAll(/`([\w./ -]+\.md)`/g)) {
          const name = m[1];
          const known = existsSync(join(repo, name)) || hcNames.has(basename(name)) ||
            siblings.some((s) => existsSync(join(s, name)));
          if (!known && !FORBIDDEN.includes(name)) err(repo, f, i + 1, `odkaz na neexistující soubor ${name}`);
        }
      });
    }
    if (STRICT.includes(f) || isMap(f)) {
      lines.forEach((l, i) => {
        for (const re of MARKERS) {
          const m = l.match(re);
          if (m) err(repo, f, i + 1, `značka nepotvrzeného „${m[0]}“ (pravidlo 1 a 2: otázka patří do chatu)`);
        }
      });
    }
    if (isCard && (["CURRENT_SPEC.md", "README.md"].includes(f) || isMap(f))) {
      let fenced = false;
      lines.forEach((l, i) => {
        if (l.trim().startsWith("```")) { fenced = !fenced; return; }
        if (fenced && f === "README.md") return; // ukázky konfigurace s vlastními názvy entit
        for (const m of l.matchAll(ENTITY_RE)) {
          const id = `${m[1]}.${m[2]}`;
          if (NOT_ENTITY.test(m[2])) continue;
          if (!exported.has(id)) err(repo, f, i + 1, `entita ${id} není v žádném exportu v ha-config/${cardKey(repo)}/entity/`);
        }
      });
    }
  }
  if (isCard && existsSync(join(repo, "examples"))) {
    for (const f of readdirSync(join(repo, "examples"))) {
      if (!/\.ya?ml$/.test(f)) continue;
      readFileSync(join(repo, "examples", f), "utf8").split("\n").forEach((l, i) => {
        if (/^\s*#/.test(l)) return;
        for (const m of l.matchAll(ENTITY_RE)) {
          const id = `${m[1]}.${m[2]}`;
          if (NOT_ENTITY.test(m[2])) continue;
          if (!exported.has(id)) warnings.push(`${basename(repo)}/examples/${f}:${i + 1}: zástupná entita ${id} (příklad; není v žádném exportu)`);
        }
      });
    }
  }
}

const args = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--ha-config") haConfigArg = process.argv[++i] || "";
  else if (process.argv[i].startsWith("--ha-config=")) haConfigArg = process.argv[i].slice(12);
  else args.push(process.argv[i]);
}
if (!args.length) { console.error("Použití: node tools/check-docs.mjs [--ha-config <adresář>] <adresář repozitáře> [...]"); process.exit(2); }
for (const a of args) check(a);
if (warnings.length) console.warn(warnings.join("\n") + `\n(${warnings.length} varování: příklady YAML mají zástupné entity)\n`);
if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} chyb v dokumentaci.`);
  process.exit(1);
}
console.log(`Dokumentace v pořádku (${args.length} repozitář/ů).`);
