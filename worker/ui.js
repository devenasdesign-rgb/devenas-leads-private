const $ = s => document.querySelector(s);
const labels = { all: "Все запросы", new: "Новые", saved: "Сохранено", replied: "Ответила", talking: "Обсуждаем", proposal: "Предложение", won: "Проект получен", closed: "Закрыто" };
const icons = { all: "▦", new: "▤", saved: "▧" };
const state = { leads: [], filter: "all", source: "all", query: "", editing: null, loading: true };
const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const count = key => key === "all" ? state.leads.length : state.leads.filter(x => x.status === key).length;
const date = x => new Date(x).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Asia/Yekaterinburg" });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yekaterinburg" });
const safeLink = x => { try { const u = new URL(x); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };

async function api(method, body) {
  const response = await fetch("/api/leads", { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Не удалось выполнить действие.");
  return data;
}
function message(text, target = "#message") { $(target).innerHTML = text ? `<div class="error" role="alert">${esc(text)}</div>` : ""; }
function render() {
  $("#nav").innerHTML = Object.entries(labels).map(([key, label]) => `<button class="nav-item ${state.filter === key ? "active" : ""}" data-filter="${key}"><span class="nav-symbol">${icons[key] || "•"}</span><span>${label}</span><em>${count(key)}</em></button>`).join("");
  const due = state.leads.filter(x => x.followUpAt && x.followUpAt <= today() && !["won", "closed"].includes(x.status)).length;
  const active = state.leads.filter(x => ["replied", "talking", "proposal"].includes(x.status)).length;
  $("#stats").innerHTML = [["Всего запросов", state.leads.length, "в твоей панели"], ["Новые", count("new"), "ждут просмотра"], ["В диалоге", active, "есть контакт"], ["Пора вернуться", due, "по твоим напоминаниям"]].map(([a,b,c]) => `<div class="stat"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join("");
  $("#list-title").textContent = labels[state.filter];
  $("#list-description").textContent = state.filter === "all" ? "Все найденные и сохранённые возможности" : "Запросы на этом этапе";
  const visible = state.leads.filter(x => (state.filter === "all" || x.status === state.filter) && (state.source === "all" || x.source === state.source) && `${x.title} ${x.excerpt} ${x.notes}`.toLowerCase().includes(state.query.toLowerCase()));
  $("#result-count").textContent = `${visible.length} запросов`;
  if (state.loading) { $("#list").innerHTML = `<div class="empty"><div class="empty-icon">◌</div><h3>Загружаю запросы…</h3></div>`; return; }
  if (!visible.length) { $("#list").innerHTML = `<div class="empty"><div class="empty-icon">✳</div><h3>${state.leads.length ? "Здесь пока пусто" : "Начнём с первого запроса"}</h3><p>${state.leads.length ? "Попробуй изменить фильтр или поиск." : "Нашла пост, где ищут дизайнера? Сохрани ссылку, заметки и следующий шаг — всё будет под рукой."}</p><button class="text-button" id="empty-add">＋ Добавить запрос</button></div>`; return; }
  $("#list").innerHTML = `<div class="lead-list">${visible.map(x => `<article class="lead-card"><div class="lead-top"><span class="source source-${esc(x.source.toLowerCase())}">${esc(x.source)}</span>${x.priority === "high" ? '<span class="high-priority">Подходит тебе</span>' : ""}<span class="lead-date">${date(x.createdAt)}</span></div><button class="lead-title" data-edit="${x.id}">${esc(x.title)}</button>${x.excerpt ? `<p class="lead-excerpt">${esc(x.excerpt)}</p>` : ""}<div class="lead-bottom"><div class="lead-meta">${x.budget ? `<span>${esc(x.budget)}</span>` : ""}${x.followUpAt ? `<span class="${x.followUpAt <= today() ? "due" : ""}">◷ ${esc(x.followUpAt)}</span>` : ""}</div><div class="lead-actions"><label class="status-select"><select data-status="${x.id}" aria-label="Статус: ${esc(x.title)}">${Object.entries(labels).slice(1).map(([key,label]) => `<option value="${key}" ${x.status === key ? "selected" : ""}>${label}</option>`).join("")}</select><span>⌄</span></label>${safeLink(x.url) ? `<a class="open-link" target="_blank" rel="noopener noreferrer" href="${esc(safeLink(x.url))}" aria-label="Открыть источник">↗</a>` : ""}</div></div></article>`).join("")}</div>`;
}
function openForm(lead) {
  state.editing = lead || "new";
  $("#form").reset();
  message("", "#form-message");
  $("#form-title").textContent = lead ? "Детали запроса" : "Новый запрос";
  $("#delete").hidden = !lead;
  if (lead) for (const name of ["title","source","url","excerpt","budget","notes","priority","followUpAt"]) $("#form").elements[name].value = lead[name] || "";
  $("#modal-layer").hidden = false;
  $("#form").elements.title.focus();
}
function closeForm() { $("#modal-layer").hidden = true; state.editing = null; }
$("#add").onclick = () => openForm();
$("#close").onclick = closeForm;
$("#cancel").onclick = closeForm;
$("#modal-layer").onclick = e => { if (e.target === $("#modal-layer")) closeForm(); };
$("#menu").onclick = () => $("#sidebar").classList.add("sidebar-open");
$("#backdrop").onclick = () => $("#sidebar").classList.remove("sidebar-open");
$("#search").oninput = e => { state.query = e.target.value; render(); };
$("#source-filter").onchange = e => { state.source = e.target.value; render(); };
$("#nav").onclick = e => { const button = e.target.closest("[data-filter]"); if (!button) return; state.filter = button.dataset.filter; $("#sidebar").classList.remove("sidebar-open"); render(); };
$("#list").onclick = e => { if (e.target.closest("#empty-add")) openForm(); const button = e.target.closest("[data-edit]"); if (button) openForm(state.leads.find(x => x.id === Number(button.dataset.edit))); };
$("#list").onchange = async e => {
  const select = e.target.closest("[data-status]"); if (!select) return;
  const id = Number(select.dataset.status), previous = state.leads.find(x => x.id === id);
  try { const { lead } = await api("PATCH", { id, status: select.value }); state.leads = state.leads.map(x => x.id === id ? lead : x); message(""); render(); }
  catch (err) { select.value = previous.status; message(err.message); }
};
$("#form").onsubmit = async e => {
  e.preventDefault();
  const button = $("#save"); button.disabled = true; button.textContent = "Сохраняю…";
  const payload = Object.fromEntries(new FormData(e.target));
  try {
    const { lead } = await api(state.editing === "new" ? "POST" : "PATCH", state.editing === "new" ? payload : { ...payload, id: state.editing.id });
    state.leads = state.editing === "new" ? [lead, ...state.leads] : state.leads.map(x => x.id === lead.id ? lead : x);
    closeForm(); message(""); render();
  } catch (err) { message(err.message, "#form-message"); }
  finally { button.disabled = false; button.textContent = "✓ Сохранить"; }
};
$("#delete").onclick = async () => {
  const lead = state.editing;
  if (!lead || lead === "new" || !confirm(`Удалить «${lead.title}»?`)) return;
  try { await api("DELETE", { id: lead.id }); state.leads = state.leads.filter(x => x.id !== lead.id); closeForm(); render(); }
  catch (err) { message(err.message, "#form-message"); }
};
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal-layer").hidden) closeForm(); });
render();
api("GET").then(data => { state.leads = data.leads; message(""); }).catch(err => message(err.message)).finally(() => { state.loading = false; render(); });
