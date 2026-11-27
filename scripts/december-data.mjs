import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function buildDecemberSeed(root) {
  const source = readFileSync(resolve(root, "content/december-2026.md"), "utf8");
  const posts = [];
  let date = "";
  for (const line of source.split(/\r?\n/)) {
    const day = line.match(/^### (\d{2})\.(\d{2}),/);
    if (day) { date = `2026-${day[2]}-${day[1]}`; continue; }
    const item = line.match(/^- \*\*(Threads|Instagram|LinkedIn|Pinterest|Behance) · ([^*]+)\*\* (.+)$/);
    if (!date || !item) continue;
    const [, platform, label, body] = item;
    const visualMatch = body.match(/(?:Визуал:|Visual:) (.+?)(?= (?:Finish|Подписи|В конце|Ссылка:)|$)/);
    const quote = body.match(/«([^»]{10,})»/);
    const title = platform === "Threads" && quote
      ? quote[1].slice(0, 78)
      : label.replace(/^карусель \d+\s*/i, "").replace(/\.$/, "").replace(/[«»]/g, "");
    posts.push({
      id: `dec26-${date}-${platform.toLowerCase()}`,
      date, platform,
      account: platform === "Threads" || platform === "Instagram" ? "devenas.design" : "Devenas Design",
      title,
      status: "idea",
      text: platform === "Pinterest" ? `Пин для Pinterest. Заголовок: ${title}.` : body,
      visual: visualMatch?.[1] ?? (platform === "Pinterest" ? body : ""),
      url: "",
      campaign: "december-2026"
    });
  }
  if (posts.length !== 69 || new Set(posts.map(p => p.date)).size !== 30)
    throw new Error(`December plan has ${posts.length} posts across ${new Set(posts.map(p => p.date)).size} days; expected 69 across 30 days`);
  return posts;
}
