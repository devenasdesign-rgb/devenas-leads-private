// Локальная версия: данные хранятся в этом браузере до подключения сервера.
(() => {
  const originalFetch = window.fetch.bind(window);
  const key = "devenas-leads-local-v1";
  let memory = [];
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return memory; } };
  const write = rows => { memory = rows; try { localStorage.setItem(key, JSON.stringify(rows)); } catch {} };
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  window.fetch = async (url, options = {}) => {
    if (url !== "/api/leads") return originalFetch(url, options);
    const method = options.method || "GET";
    const rows = read();
    if (method === "GET") return response({ leads: rows });
    let body; try { body = JSON.parse(options.body); } catch { return response({ error: "Не удалось прочитать запрос." }, 400); }
    if (method === "POST") {
      if (!body.title?.trim()) return response({ error: "Добавь название запроса." }, 400);
      if (body.url && rows.some(x => x.url === body.url)) return response({ error: "Эта ссылка уже есть в панели." }, 409);
      const now = new Date().toISOString();
      const lead = { ...body, id: Date.now(), status: "new", createdAt: now, updatedAt: now };
      write([lead, ...rows]); return response({ lead }, 201);
    }
    const index = rows.findIndex(x => x.id === Number(body.id));
    if (index < 0) return response({ error: "Запрос не найден." }, 404);
    if (method === "DELETE") { rows.splice(index, 1); write(rows); return response({ ok: true }); }
    if (method === "PATCH") {
      rows[index] = { ...rows[index], ...body, id: rows[index].id, updatedAt: new Date().toISOString() };
      write(rows); return response({ lead: rows[index] });
    }
    return response({ error: "Действие не поддерживается." }, 405);
  };
})();
