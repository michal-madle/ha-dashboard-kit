// Copies the built card `dist/<name>.js` to the root of the repository, where HACS reads it.
//   node node_modules/ha-dashboard-kit/build/copy-build.mjs ha-energie-dashboard
import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: copy-build.mjs <card-file-name-without-.js>");
  process.exit(1);
}
await copyFile(resolve("dist", `${name}.js`), resolve(`${name}.js`));
