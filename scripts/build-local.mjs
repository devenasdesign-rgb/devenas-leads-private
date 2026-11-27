import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDecemberSeed } from "./december-data.mjs";
const root = resolve(import.meta.dirname, "..");
const read = name => readFileSync(resolve(root, "worker", name), "utf8");
const contentPlan = read("content-plan.html").replace("__DECEMBER_SEED__", JSON.stringify(buildDecemberSeed(root)));
const page = read("ui.html")
  .replace('<link rel="stylesheet" href="/ui.css">', `<style>${read("ui.css")}</style>`)
  .replace('<script src="/ui.js" defer></script>', `<script>${read("local-adapter.js")}</script><script>${read("ui.js")}</script>`)
  .replace("Пока запросы добавляются вручную.", "Локальная версия для проверки.")
  .replace("Это первая версия. Следующим шагом подключим поиск доступных публикаций и уведомления.", "Карточки сохраняются в этом браузере. После публикации подключим хранение между устройствами и поиск публикаций.");
writeFileSync(resolve(root, "Devenas-Leads.html"), page);
mkdirSync(resolve(root, "docs"), { recursive: true });
writeFileSync(resolve(root, "docs", "index.html"), page);
writeFileSync(resolve(root, "docs", "content-plan.html"), contentPlan);
writeFileSync(resolve(root, "docs", "strategy.html"), read("strategy.html"));
