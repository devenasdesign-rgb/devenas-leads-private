import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDecemberSeed } from "./december-data.mjs";
const root = resolve(import.meta.dirname, "..");
let source = readFileSync(resolve(root, "worker/index.js"), "utf8");
for (const [token, filename] of [["__HTML__", "ui.html"], ["__CSS__", "ui.css"], ["__JS__", "ui.js"], ["__PLAN_HTML__", "content-plan.html"], ["__STRATEGY_HTML__", "strategy.html"]]) {
  let content = readFileSync(resolve(root, "worker", filename), "utf8");
  if (filename === "content-plan.html") content = content.replace("__DECEMBER_SEED__", JSON.stringify(buildDecemberSeed(root)));
  source = source.replace(token, JSON.stringify(content));
}
writeFileSync(resolve(root, "dist/server/index.js"), source);
