// Static file server for the Playwright tests of a card: serves the repository root, so the
// harness can load the built card and the test fonts from node_modules.
//   tests/server.mjs of a card:
//     import { startServer } from "ha-dashboard-kit/testing/server.mjs";
//     startServer({ card: "ha-energie-dashboard.js", port: 4174 });
// PORT overrides the port; CARD_BUNDLE serves another build of the card under the same name
// (the coverage run).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

/**
 * @param {{ card: string, port: number, root?: string }} options
 *   card: file name of the built card in the root ("ha-energie-dashboard.js"); root: default cwd
 */
export function startServer({ card, port, root = process.cwd() }) {
  const base = resolve(root);
  const listenPort = Number(process.env.PORT ?? port);
  const bundle = process.env.CARD_BUNDLE ? resolve(base, process.env.CARD_BUNDLE) : undefined;
  createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname));
    const file = bundle && path === `/${card}` ? bundle : join(base, path);
    if (!file.startsWith(base)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  }).listen(listenPort, "127.0.0.1", () => {
    console.log(`Test server on http://127.0.0.1:${listenPort}`);
  });
}
