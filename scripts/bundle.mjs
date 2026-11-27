import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
let source = readFileSync(resolve(root, "worker/index.js"), "utf8");
for (const [token, filename] of [["__HTML__", "ui.html"], ["__CSS__", "ui.css"], ["__JS__", "ui.js"]]) {
  source = source.replace(token, JSON.stringify(readFileSync(resolve(root, "worker", filename), "utf8")));
}
writeFileSync(resolve(root, "dist/server/index.js"), source);
