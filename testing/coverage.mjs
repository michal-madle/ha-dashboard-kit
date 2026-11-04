// `npm run coverage` of a card: the browser tests with the JavaScript coverage of the card (V8 in
// Chromium), mapped back to src/*.ts (and to the sources of the kit) through an inline source map.
// The card is built separately into coverage/build (the distributed card stays untouched) and
// served on its own port. Prints a table per file; coverage/report/coverage-final.json (Istanbul)
// allows an exact before / after comparison, coverage/raw/ keeps the V8 data of each test. Extra
// arguments go to `playwright test`.
//   tests/coverage.mjs of a card:
//     import { runCoverage } from "ha-dashboard-kit/testing/coverage.mjs";
//     await runCoverage({ name: "Energie Dashboard", card: "ha-energie-dashboard.js", port: 4184 });
import { execFileSync } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { CoverageReport } from "monocart-coverage-reports";

/** @param {{ name: string, card: string, port: number }} options */
export async function runCoverage({ name, card, port }) {
  await rm("coverage", { recursive: true, force: true });
  execFileSync("npx", ["vite", "build", "--sourcemap", "inline", "--outDir", "coverage/build", "--emptyOutDir"], { stdio: "inherit" });

  let failed = false;
  try {
    execFileSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
      stdio: "inherit",
      env: { ...process.env, CARD_COVERAGE: "1", CARD_BUNDLE: `coverage/build/${card}`, CARD_PORT: String(port) },
    });
  } catch {
    failed = true;
  }

  const report = new CoverageReport({
    name,
    outputDir: "coverage/report",
    reports: ["console-details", "json-summary", "json"],
    sourceFilter: (path) => path.includes("src/"),
  });
  for (const file of await readdir("coverage/raw")) {
    const { entries } = JSON.parse(await readFile(`coverage/raw/${file}`, "utf8"));
    // A test that never opens the card page (e.g. the check of the example YAML) has nothing to add.
    if (entries.length > 0) {
      await report.add(entries);
    }
  }
  await report.generate();
  if (failed) {
    process.exitCode = 1;
  }
}
