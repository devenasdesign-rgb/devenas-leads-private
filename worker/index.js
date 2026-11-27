const page = __HTML__;
const styles = __CSS__;
const client = __JS__;
const contentPlan = __PLAN_HTML__;
const strategyPage = __STRATEGY_HTML__;
const sources = ["Threads", "Instagram", "Pinterest", "Telegram", "Сайт", "Рекомендация", "Другое"];
const statuses = ["new", "saved", "replied", "talking", "proposal", "won", "closed"];
const priorities = ["high", "medium", "low"];
const mcpTools = [
  { name: "list_leads", description: "Показать мои сохранённые запросы на дизайн и сайты. Можно отфильтровать по статусу или площадке.", inputSchema: { type: "object", properties: { status: { type: "string", enum: statuses }, source: { type: "string", enum: sources }, limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false } },
  { name: "add_lead", description: "Сохранить тёплый запрос, который пользователь хочет добавить в панель.", inputSchema: { type: "object", required: ["title"], properties: { title: { type: "string" }, source: { type: "string", enum: sources }, url: { type: "string" }, excerpt: { type: "string" }, budget: { type: "string" }, notes: { type: "string" }, priority: { type: "string", enum: priorities }, followUpAt: { type: "string", description: "Дата в формате ГГГГ-ММ-ДД" } }, additionalProperties: false } },
  { name: "update_lead", description: "Обновить статус, заметку или дату возврата для сохранённого запроса.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" }, status: { type: "string", enum: statuses }, notes: { type: "string" }, followUpAt: { type: "string", description: "Дата в формате ГГГГ-ММ-ДД или пустая строка" } }, additionalProperties: false } },
];
const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
const json = (data, status = 200) => Response.json(data, { status, headers: privateHeaders });
const val = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
function validUrl(raw) {
  if (!raw) return "";
  try { const u = new URL(raw); return ["https:", "http:"].includes(u.protocol) ? u.toString() : null; }
  catch { return null; }
}

async function handleMcp(request, env) {
  const owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) return json({ jsonrpc: "2.0", error: { code: -32001, message: "Вход обязателен" }, id: null }, 401);
  let rpc;
  try { rpc = await request.json(); } catch { return json({ jsonrpc: "2.0", error: { code: -32700, message: "Неверный JSON" }, id: null }, 400); }
  const id = rpc?.id ?? null;
  const result = value => json({ jsonrpc: "2.0", id, result: value });
  const toolResult = (value, isError = false) => result({ content: [{ type: "text", text: JSON.stringify(value) }], ...(isError ? { isError: true } : {}) });
  if (rpc?.method === "server/discover") return result({ supportedVersions: ["2026-07-28"], capabilities: { tools: {} } });
  if (rpc?.method === "tools/list") return result({ tools: mcpTools });
  if (rpc?.method !== "tools/call") return json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Метод не найден" } });
  const name = rpc?.params?.name;
  const args = rpc?.params?.arguments ?? {};
  if (!args || typeof args !== "object" || Array.isArray(args)) return toolResult({ error: "Неверные параметры" }, true);
  if (!env.DB) return toolResult({ error: "Хранилище пока не подключено" }, true);
  try {
    if (name === "list_leads") {
      const limit = Math.max(1, Math.min(100, Number(args.limit) || 50));
      const status = statuses.includes(args.status) ? args.status : null;
      const source = sources.includes(args.source) ? args.source : null;
      const rows = await env.DB.prepare("SELECT id,title,source,url,excerpt,budget,notes,status,priority,follow_up_at AS followUpAt,created_at AS createdAt FROM leads WHERE owner_id=? AND (? IS NULL OR status=?) AND (? IS NULL OR source=?) ORDER BY created_at DESC,id DESC LIMIT ?")
        .bind(owner,status,status,source,source,limit).all();
      return toolResult({ leads: rows.results || [] });
    }
    if (name === "add_lead") {
      const title = val(args.title,180), url = validUrl(val(args.url,1000));
      if (!title || url === null) return toolResult({ error: "Нужно название и корректная ссылка, если она указана" }, true);
      if (url && await env.DB.prepare("SELECT id FROM leads WHERE owner_id=? AND url=? LIMIT 1").bind(owner,url).first()) return toolResult({ error: "Эта ссылка уже сохранена" }, true);
      const now = new Date().toISOString();
      const lead = await env.DB.prepare("INSERT INTO leads (owner_id,title,source,url,excerpt,budget,notes,status,priority,follow_up_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id,title,source,url,status,priority,created_at AS createdAt")
        .bind(owner,title,sources.includes(args.source)?args.source:"Другое",url,val(args.excerpt,3000),val(args.budget,100),val(args.notes,3000),"new",priorities.includes(args.priority)?args.priority:"medium",val(args.followUpAt,20),now,now).first();
      return toolResult({ lead });
    }
    if (name === "update_lead") {
      const leadId = Number(args.id);
      if (!Number.isSafeInteger(leadId) || leadId < 1) return toolResult({ error: "Неверный номер запроса" }, true);
      const old = await env.DB.prepare("SELECT * FROM leads WHERE owner_id=? AND id=?").bind(owner,leadId).first();
      if (!old) return toolResult({ error: "Запрос не найден" }, true);
      const lead = await env.DB.prepare("UPDATE leads SET status=?,notes=?,follow_up_at=?,updated_at=? WHERE owner_id=? AND id=? RETURNING id,title,status,notes,follow_up_at AS followUpAt")
        .bind(statuses.includes(args.status)?args.status:old.status,args.notes===undefined?old.notes:val(args.notes,3000),args.followUpAt===undefined?old.follow_up_at:val(args.followUpAt,20),new Date().toISOString(),owner,leadId).first();
      return toolResult({ lead });
    }
    return toolResult({ error: "Инструмент не найден" }, true);
  } catch (error) { console.error("MCP operation failed", error); return toolResult({ error: "Не удалось выполнить действие" }, true); }
}

async function handleApi(request, env) {
  const owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) return json({ error: "Войди через ChatGPT, чтобы открыть свои запросы." }, 401);
  if (!env.DB) return json({ error: "Хранилище пока не подключено." }, 503);
  const db = env.DB;
  try {
    if (request.method === "GET") {
      const rows = await db.prepare("SELECT id,title,source,url,excerpt,budget,notes,status,priority,follow_up_at AS followUpAt,created_at AS createdAt,updated_at AS updatedAt FROM leads WHERE owner_id=? ORDER BY created_at DESC,id DESC LIMIT 500").bind(owner).all();
      return json({ leads: rows.results || [] });
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: "Неверный формат данных." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Неверный формат данных." }, 400);
    if (request.method === "POST") {
      const title = val(body.title, 180);
      const url = validUrl(val(body.url, 1000));
      if (!title) return json({ error: "Добавь название запроса." }, 400);
      if (url === null) return json({ error: "Ссылка должна начинаться с https:// или http://." }, 400);
      if (url) {
        const found = await db.prepare("SELECT id FROM leads WHERE owner_id=? AND url=? LIMIT 1").bind(owner, url).first();
        if (found) return json({ error: "Эта ссылка уже есть в панели." }, 409);
      }
      const now = new Date().toISOString();
      const result = await db.prepare("INSERT INTO leads (owner_id,title,source,url,excerpt,budget,notes,status,priority,follow_up_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id,title,source,url,excerpt,budget,notes,status,priority,follow_up_at AS followUpAt,created_at AS createdAt,updated_at AS updatedAt")
        .bind(owner,title,sources.includes(body.source) ? body.source : "Другое",url,val(body.excerpt,3000),val(body.budget,100),val(body.notes,3000),"new",priorities.includes(body.priority) ? body.priority : "medium",val(body.followUpAt,20),now,now).first();
      return json({ lead: result }, 201);
    }
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Неверный номер запроса." }, 400);
    if (request.method === "DELETE") {
      const result = await db.prepare("DELETE FROM leads WHERE owner_id=? AND id=? RETURNING id").bind(owner,id).first();
      return result ? json({ ok: true }) : json({ error: "Запрос не найден." }, 404);
    }
    if (request.method === "PATCH") {
      const current = await db.prepare("SELECT * FROM leads WHERE owner_id=? AND id=?").bind(owner,id).first();
      if (!current) return json({ error: "Запрос не найден." }, 404);
      const title = body.title === undefined ? current.title : val(body.title,180);
      const url = body.url === undefined ? current.url : validUrl(val(body.url,1000));
      if (!title) return json({ error: "Добавь название запроса." }, 400);
      if (url === null) return json({ error: "Неверная ссылка." }, 400);
      if (url && url !== current.url) {
        const found = await db.prepare("SELECT id FROM leads WHERE owner_id=? AND url=? AND id<>? LIMIT 1").bind(owner,url,id).first();
        if (found) return json({ error: "Эта ссылка уже есть в панели." }, 409);
      }
      const result = await db.prepare("UPDATE leads SET title=?,source=?,url=?,excerpt=?,budget=?,notes=?,status=?,priority=?,follow_up_at=?,updated_at=? WHERE owner_id=? AND id=? RETURNING id,title,source,url,excerpt,budget,notes,status,priority,follow_up_at AS followUpAt,created_at AS createdAt,updated_at AS updatedAt")
        .bind(title,sources.includes(body.source) ? body.source : current.source,url,body.excerpt === undefined ? current.excerpt : val(body.excerpt,3000),body.budget === undefined ? current.budget : val(body.budget,100),body.notes === undefined ? current.notes : val(body.notes,3000),statuses.includes(body.status) ? body.status : current.status,priorities.includes(body.priority) ? body.priority : current.priority,body.followUpAt === undefined ? current.follow_up_at : val(body.followUpAt,20),new Date().toISOString(),owner,id).first();
      return json({ lead: result });
    }
    return json({ error: "Действие не поддерживается." }, 405);
  } catch (error) {
    console.error("Lead operation failed", error);
    return json({ error: "Не удалось выполнить действие. Попробуй ещё раз." }, 500);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { ...privateHeaders, "content-type": "text/plain; charset=utf-8" } });
    if (!request.headers.get("oai-authenticated-user-id")) return new Response("Доступ только после входа", { status: 401, headers: privateHeaders });
    if (path === "/mcp" && request.method === "POST") return handleMcp(request, env);
    if (path === "/api/leads") return handleApi(request, env);
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    if (path === "/") return new Response(page, { headers: { ...privateHeaders, "content-type": "text/html; charset=utf-8" } });
    if (path === "/content-plan.html") return new Response(contentPlan, { headers: { ...privateHeaders, "content-type": "text/html; charset=utf-8" } });
    if (path === "/strategy.html") return new Response(strategyPage, { headers: { ...privateHeaders, "content-type": "text/html; charset=utf-8" } });
    if (path === "/ui.css") return new Response(styles, { headers: { ...privateHeaders, "content-type": "text/css; charset=utf-8" } });
    if (path === "/ui.js") return new Response(client, { headers: { ...privateHeaders, "content-type": "application/javascript; charset=utf-8" } });
    return new Response("Not found", { status: 404 });
  },
};
