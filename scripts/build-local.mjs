import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = name => readFileSync(resolve(root, "worker", name), "utf8");
const page = read("ui.html")
  .replace('<link rel="stylesheet" href="/ui.css">', `<style>${read("ui.css")}</style>`)
  .replace('<script src="/ui.js" defer></script>', `<script>${read("local-adapter.js")}</script><script>${read("ui.js")}</script>`)
  .replace("Пока запросы добавляются вручную.", "Локальная версия для проверки.")
  .replace("Это первая версия. Следующим шагом подключим поиск доступных публикаций и уведомления.", "Карточки сохраняются в этом браузере. После публикации подключим хранение между устройствами и поиск публикаций.");
writeFileSync(resolve(root, "Devenas-Leads.html"), page);
