// Vite configuration of a card: one ES module `dist/<name>.js` built from `src/index.ts`.
// A card calls `cardBuild("ha-energie-dashboard")` in its own vite.config.ts.

/** @param {string} name file name of the card without ".js", e.g. "ha-energie-dashboard" */
export function cardBuild(name) {
  return {
    build: {
      lib: { entry: "src/index.ts", formats: ["es"], fileName: name },
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
    },
  };
}
