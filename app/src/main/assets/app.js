"use strict";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const native = typeof Android !== "undefined";
const icons = {
  glass: '<path d="M7 3h10l1 7a6 6 0 0 1-12 0l1-7Zm5 13v5m-4 0h8M6 9h12"/>',
  sets: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M9 10v10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  people:
    '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v2"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  bottle: '<path d="M10 3h4v6l3 4v8H7v-8l3-4V3Zm-3 12h10M10 6h4"/>',
  settings:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  blind:
    '<path d="m3 3 18 18M10 5a11 11 0 0 1 12 7 17 17 0 0 1-4 4M6 6a17 17 0 0 0-4 6s4 7 10 7a12 12 0 0 0 5-1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  cup: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 1h8"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z"/>',
  camera:
    '<path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="14" r="4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10v1"/>',
};
const icon = (k) =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  (icons[k] || icons.glass) +
  "</svg>";
const btn = (text, action, cls = "secondary", id = "", extra = "") =>
  `<button type="button" class="btn ${cls}" data-action="${action}" ${id ? `data-id="${esc(id)}"` : ""} ${extra}>${text}</button>`;
const fmt = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const date = (d) =>
  Core.validDate(d) ? d.split("-").reverse().join(".") : "—";
let S,
  loadError = "";
try {
  const raw = native
    ? Android.readState()
    : localStorage.getItem("degustation");
  S = raw ? Core.validateState(JSON.parse(raw)) : Core.fresh();
} catch (e) {
  loadError = e.message;
  S = Core.fresh();
}
let screen = { name: S.settings.mode ? "sets" : "mode" },
  stack = [],
  modal = null,
  photo = "",
  importRows = null,
  filter = "all",
  sort = "number",
  search = "",
  historyUser = "",
  compareName = "",
  compareUser = "",
  compareFrom = "",
  compareTo = "",
  ratingContext = null,
  draft = null,
  resultsSession = null,
  resultsUser = "";
const getSet = (id) => S.sets.find((x) => x.id === id),
  getWine = (id) => S.wines.find((x) => x.id === id),
  getUser = (id) => S.users.find((x) => x.id === id),
  active = () =>
    S.sessions.find(
      (x) => x.id === S.settings.activeSession && x.status === "active",
    );
function notify(t) {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("visible");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.classList.remove("visible"), 3600);
}
function commit(fn, rerender = true) {
  if (loadError) {
    notify(
      "Данные не перезаписаны: сначала восстановите резервную копию в настройках",
    );
    return false;
  }
  try {
    const next = JSON.parse(JSON.stringify(S));
    fn(next);
    Core.validateState(next);
    const str = JSON.stringify(next);
    if (native) {
      if (!Android.writeState(str))
        throw Error("Не удалось записать данные. Проверьте свободное место.");
    } else localStorage.setItem("degustation", str);
    S = next;
    if (rerender) render();
    return true;
  } catch (e) {
    notify(e.message);
    return false;
  }
}
function go(name, id, replace = false) {
  if (!leaveRating()) return;
  if (!replace) stack.push({ ...screen });
  screen = { name, id };
  search = "";
  filter = "all";
  sort = "number";
  render();
  window.scrollTo(0, 0);
}
function back() {
  if (modal) {
    closeModal();
    return true;
  }
  if (screen.name === "rating") {
    saveDraft();
    confirmBox(
      "Выйти из листа?",
      "Черновик сохранён. К нему можно вернуться, открыв этот образец тем же оценщиком.",
      () => {
        screen = stack.pop() || { name: "sets" };
        ratingContext = null;
        draft = null;
        render();
      },
    );
    return true;
  }
  if (stack.length) {
    screen = stack.pop();
    search = "";
    render();
    return true;
  }
  if (screen.name !== "sets" && screen.name !== "mode") {
    screen = { name: "sets" };
    render();
    return true;
  }
  return false;
}
function leaveRating() {
  if (screen.name === "rating") {
    saveDraft();
  }
  return true;
}
function nav(name) {
  go(name, null, true);
  stack = [];
}
function modalBox(title, html, wide = false) {
  modal = { title, html };
  $("#modal-root").innerHTML =
    `<div class="veil"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal-head"><h2 id="dialog-title">${esc(title)}</h2>${btn(icon("close"), "close", "icon", "", 'aria-label="Закрыть"')}</div><div class="modal-content">${html}</div></section></div>`;
  setTimeout(
    () =>
      $(
        ".modal input:not([type=checkbox]),.modal select,.modal button",
      )?.focus(),
    70,
  );
}
function closeModal() {
  modal = null;
  $("#modal-root").innerHTML = "";
  if (screen.name === "rating")
    setTimeout(() => $(".criterion button")?.focus(), 20);
}
function confirmBox(title, text, fn) {
  modalBox(
    title,
    `<p>${esc(text)}</p><div class="actions">${btn("Отмена", "close")}${btn("Продолжить", "confirm", "primary")}</div>`,
  );
  modal.confirm = fn;
}
const input = (label, name, value = "", type = "text", extra = "") =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const select = (label, name, options, value = "", extra = "") =>
  `<label class="field"><span>${label}</span><select name="${name}" ${extra}>${options.map((o) => `<option value="${esc(o[0])}" ${String(value) === String(o[0]) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select></label>`;
const userOptions = () => S.users.map((u) => [u.id, u.name]);
const schemaOptions = () =>
  Object.entries(Core.schemas).map(([k, v]) => [k, v.name]);
function shell(content) {
  const item = (n, i, t) =>
    `<button class="nav-item ${screen.name === n ? "active" : ""}" data-action="nav" data-id="${n}">${icon(i)}<span>${t}</span></button>`;
  return `<aside class="sidebar"><div class="brand"><span class="brand-icon">${icon("glass")}</span><span>Дегустационный<br><b>лист</b><small>ВКУС В ДЕТАЛЯХ</small></span></div><nav>${item("sets", "sets", "Мои сеты")}${item("catalogue", "bottle", "Коллекция")}${item("compare", "chart", "Сравнение")}${item("people", "people", "Оценщики")}${item("settings", "settings", "Настройки")}</nav><div class="side-note"><span class="dot"></span> Все записи на устройстве<br><small>Ваша личная история вкуса</small></div></aside><div class="workspace"><header class="topbar"><span class="top-label">ДЕГУСТАЦИОННЫЙ ДНЕВНИК</span><div class="top-actions">${btn(icon(S.settings.mode === "group" ? "people" : "glass") + (S.settings.mode === "group" ? "Компания" : "Личная"), "mode", "mode-chip")}<button class="avatar" data-action="pick-user" aria-label="Выбрать оценщика">${esc(getUser(S.settings.userId)?.name.slice(0, 1).toUpperCase() || "Д")}</button></div></header><main>${content}</main><footer>Дегустационный лист <span>100 баллов · бесконечность впечатлений</span></footer></div><nav class="bottom-nav">${item("sets", "sets", "Сеты")}${item("catalogue", "bottle", "Вина")}${item("compare", "chart", "Сравнить")}${item("people", "people", "Оценщики")}${item("settings", "settings", "Ещё")}</nav>`;
}
function pageHead(kicker, title, desc, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${esc(title)}</h1>${desc ? `<p class="sub">${esc(desc)}</p>` : ""}</div><div class="actions">${actions}</div></div>`;
}
function empty(title, text, button = "") {
  return `<div class="empty"><div class="empty-icon">${icon("glass")}</div><h2>${title}</h2><p>${text}</p>${button}</div>`;
}
function render() {
  document.body.classList.toggle("rating-view", screen.name === "rating");
  let html = "";
  if (screen.name === "mode") html = modePage();
  else if (screen.name === "sets") html = home();
  else if (screen.name === "set") html = setPage();
  else if (screen.name === "wine") html = winePage();
  else if (screen.name === "rating") html = ratingPage();
  else if (screen.name === "results") html = resultsPage();
  else if (screen.name === "catalogue") html = cataloguePage();
  else if (screen.name === "people") html = peoplePage();
  else if (screen.name === "compare") html = comparePage();
  else html = settingsPage();
  $("#app").innerHTML = screen.name === "mode" ? html : shell(html);
  if (native && JSON.parse(Android.deviceInfo()).tv)
    document.body.classList.add("tv");
}
function modePage() {
  return `<div class="welcome"><div class="welcome-logo">${icon("glass")}</div><div class="eyebrow">ВКУС В ДЕТАЛЯХ</div><h1>Дегустационный<br><em>лист</em></h1><p>Каждое вино — новая история.<br>Сохраните свои впечатления.</p><h2>Как будем дегустировать?</h2><div class="mode-grid"><button class="mode-card" data-action="choose-mode" data-id="solo">${icon("glass")}<b>Личная дегустация</b><span>Любое вино из любого сета.<br>Ваши оценки и их история.</span>${icon("arrow")}</button><button class="mode-card" data-action="choose-mode" data-id="group">${icon("people")}<b>В компании</b><span>Один сет, несколько оценщиков.<br>Общие результаты и победители.</span>${icon("arrow")}</button></div><small>Без регистрации · данные хранятся на этом устройстве</small>${loadError ? `<div class="notice error">Не удалось прочитать сохранённые данные. ${esc(loadError)} ${btn("Восстановление", "nav", "secondary", "settings")}</div>` : ""}</div>`;
}
function home() {
  const a = active();
  return (
    pageHead(
      "ВАША КОЛЛЕКЦИЯ",
      "Мои сеты",
      "Собирайте вина. Открывайте оттенки. Сохраняйте впечатления.",
      btn(icon("plus") + "Новый сет", "new-set", "primary"),
    ) +
    `<section class="hero"><div><span class="eyebrow">ИСКУССТВО ДЕГУСТАЦИИ</span><h2>Вкус — в деталях.<br><em>История — в записях.</em></h2><p>От первого аромата до долгого послевкусия.<br>Каждое впечатление заслуживает своего места.</p><div class="hero-tags"><span>100-балльная шкала</span><span>${S.settings.mode === "group" ? "Несколько оценщиков" : "Личная дегустация"}</span></div></div><div class="hero-art" aria-hidden="true"><div class="art-circle"></div><svg viewBox="0 0 200 230" fill="none"><path d="M65 20h70l8 63c6 52-92 52-86 0l8-63Z" stroke="currentColor" stroke-width="2"/><path d="M60 72c25 14 52-13 80 0l3 11c6 52-92 52-86 0l3-11Z" fill="currentColor" opacity=".23"/><path d="M100 126v79m-35 4h70M75 29h4" stroke="currentColor" stroke-width="2"/><path d="M78 38 73 70" stroke="currentColor" stroke-width="3" opacity=".5"/></svg><span>NOTES OF TASTE</span></div></section>${a ? `<div class="session-banner"><div>${icon("people")}<span><b>Идёт дегустация · ${esc(getSet(a.setId).name)}</b><small>${a.userIds.length} оценщика · ${date(a.date)} · ${a.blind ? "вслепую" : "открытая"}</small></span></div>${btn("Продолжить " + icon("arrow"), "set", "primary", a.setId)}</div>` : ""}<div class="stats-strip"><div><strong>${S.sets.length}</strong><span>сетов</span></div><div><strong>${S.wines.length}</strong><span>вин в коллекции</span></div><div><strong>${S.ratings.length}</strong><span>впечатлений</span></div></div><div class="section-title"><h2>Дегустационные сеты</h2><span>${S.sets.length ? S.sets.length + " в коллекции" : "Начните свою историю"}</span></div>${
      S.sets.length
        ? `<div class="set-grid">${S.sets
            .map((set, i) => {
              const ratings = S.ratings.filter((r) => r.setId === set.id);
              const count = new Set(ratings.map((r) => r.wineId)).size;
              return `<article class="set-card"><div class="set-cover cover-${i % 3}"><span class="set-index">СЕТ ${String(i + 1).padStart(2, "0")}</span>${icon("glass")}<span class="cover-label">${esc(set.description || "Коллекция впечатлений")}</span></div><div class="set-content"><div class="card-meta">${date(set.date)}<span>${set.entries.length} образцов</span></div><button class="title-link" data-action="set" data-id="${set.id}">${esc(set.name)}</button><div class="progress-track"><i style="width:${set.entries.length ? (count / set.entries.length) * 100 : 0}%"></i></div><div class="card-bottom"><span>${count} из ${set.entries.length} оценено</span>${btn(icon("arrow"), "set", "icon", set.id, 'aria-label="Открыть сет"')}</div></div></article>`;
            })
            .join(
              "",
            )}<button class="add-card" data-action="new-set">${icon("plus")}<b>Новая история</b><span>Создайте дегустационный сет</span></button></div>`
        : empty(
            "Ваш первый дегустационный сет",
            "Добавьте вина вручную или загрузите их из CSV.",
            btn(icon("plus") + "Создать сет", "new-set", "primary") +
              btn("Посмотреть пример", "example"),
          )
    }`
  );
}
function setPage() {
  const set = getSet(screen.id);
  if (!set) return empty("Сет не найден", "Вернитесь к списку сетов");
  const a =
    S.settings.mode === "group" && active()?.setId === set.id ? active() : null;
  let board = Core.leaderboard(S, set.id, a?.id);
  if (filter === "rated") board = board.filter((r) => r.count);
  if (filter === "unrated") board = board.filter((r) => !r.count);
  if (search)
    board = board.filter((r) =>
      Core.normalize(
        r.wine.name + " " + r.number + " " + (r.wine.producer || ""),
      ).includes(Core.normalize(search)),
    );
  board.sort((x, y) =>
    sort === "asc"
      ? (x.avg ?? Infinity) - (y.avg ?? Infinity)
      : sort === "desc"
        ? (y.avg ?? -1) - (x.avg ?? -1)
        : sort === "name"
          ? x.wine.name.localeCompare(y.wine.name, "ru")
          : x.number.localeCompare(y.number, "ru", { numeric: true }),
  );
  return (
    `<div class="breadcrumbs">${btn(icon("back") + "Мои сеты", "nav", "text", "sets")}</div>` +
    pageHead(
      "ДЕГУСТАЦИОННЫЙ СЕТ",
      set.name,
      set.description || "Вина, впечатления и результаты в одном месте.",
      btn(
        icon("edit"),
        "edit-set",
        "icon",
        set.id,
        'aria-label="Изменить сет"',
      ) +
        btn(icon("cup") + "Результаты", "results", "secondary", set.id) +
        btn(icon("glass") + "Оценить", "start", "primary", set.id),
    ) +
    `${a ? `<div class="notice">${icon("people")}<span>Групповая дегустация · ${date(a.date)} · ${a.userIds.length} оценщика<br><small>Показаны оценки текущей сессии. Передавайте устройство следующему оценщику.</small></span></div>` : ""}<div class="toolbar"><div class="tabs">${[
      ["all", "Все вина"],
      ["rated", "Оценённые"],
      ["unrated", "Без оценки"],
    ]
      .map(([v, t]) =>
        btn(t, "filter", filter === v ? "tab selected" : "tab", v),
      )
      .join(
        "",
      )}</div><div class="actions">${btn(icon("plus") + "Добавить вино", "add-menu", "secondary", set.id)}${btn(icon("download"), "export-menu", "icon", set.id, 'aria-label="Экспорт CSV"')}</div></div><div class="list-tools"><label class="search"><span>Поиск</span><input id="search" aria-label="Название или номер образца" placeholder="Название или номер образца" value="${esc(search)}"></label>${select(
      "Сортировка",
      "sort",
      [
        ["number", "По номеру в сете"],
        ["name", "По названию"],
        ["desc", "Сначала высокая оценка"],
        ["asc", "Сначала низкая оценка"],
      ],
      sort,
      'id="sort"',
    )}</div><div class="wine-list">${board.length ? board.map((r) => wineRow(r, set.id)).join("") : empty("Здесь пока нет вин", search ? "Попробуйте другой запрос." : "Добавьте образцы или выберите другое представление.")}</div><p class="footnote">Один образец можно оценивать повторно. ${a ? "Результат — среднее по оценщикам; повторные оценки одного участника имеют равный суммарный вес." : "Баллы — среднее всех оценок вина в этом сете."}</p>`
  );
}
function wineRow(r, setId) {
  return `<article class="wine-row"><div class="sample-number"><small>ОБРАЗЕЦ</small><b>${esc(r.number)}</b></div><button class="wine-info" data-action="wine" data-id="${r.wineId}" data-set="${setId}"><b>${esc(r.wine.name)}</b><span>${esc([r.wine.producer, r.wine.year, r.wine.type].filter(Boolean).join(" · ") || "Без описания")}</span></button><div class="wine-score ${r.count ? "has-score" : ""}"><strong>${fmt(r.avg)}</strong><small>${r.count ? r.count + " оценок" : "не оценено"}</small></div>${btn(icon("glass"), "rate-wine", "icon", r.wineId, `data-set="${setId}" aria-label="Оценить образец ${esc(r.number)}"`)}</article>`;
}
function cataloguePage() {
  let wines = S.wines.filter((w) =>
    Core.normalize(w.name + " " + w.producer + " " + (w.year || "")).includes(
      Core.normalize(search),
    ),
  );
  return (
    pageHead(
      "ЛИЧНАЯ ВИНОТЕКА",
      "Коллекция",
      "Все вина из всех сетов. Каждая бутылка со своей историей.",
    ) +
    `<div class="list-tools"><label class="search"><span>Поиск по коллекции</span><input id="search" placeholder="Название, производитель или год" value="${esc(search)}"></label><span class="muted">${wines.length} вин</span></div>${
      wines.length
        ? `<div class="wine-list">${wines
            .map((w) => {
              const st = Core.stats(S.ratings.filter((r) => r.wineId === w.id));
              return `<article class="wine-row"><span class="bottle-icon">${icon("bottle")}</span><button class="wine-info" data-action="wine" data-id="${w.id}"><b>${esc(w.name)}</b><span>${esc([w.producer, w.year].filter(Boolean).join(" · "))}</span></button><div class="wine-score"><strong>${fmt(st.avg)}</strong><small>${st.count} оценок</small></div>${btn(icon("arrow"), "wine", "icon", w.id, 'aria-label="Карточка вина"')}</article>`;
            })
            .join("")}</div>`
        : empty(
            "Коллекция начинается с одного вина",
            "Создайте сет и добавьте в него образцы.",
            btn("К сетам", "nav", "primary", "sets"),
          )
    }`
  );
}
function winePage() {
  const w = getWine(screen.id);
  if (!w) return "";
  const ratings = S.ratings
    .filter(
      (r) => r.wineId === w.id && (!historyUser || r.userId === historyUser),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  const st = Core.stats(ratings);
  const memberships = S.sets.filter((x) =>
    x.entries.some((e) => e.wineId === w.id),
  );
  return (
    `<div class="breadcrumbs">${btn(icon("back") + "Назад", "back", "text")}</div>` +
    pageHead(
      "КАРТОЧКА ВИНА",
      w.name,
      [w.producer, w.year].filter(Boolean).join(" · "),
      btn(icon("edit") + "Изменить", "edit-wine", "secondary", w.id) +
        btn(icon("glass") + "Оценить", "rate-catalogue", "primary", w.id),
    ) +
    `<section class="wine-detail"><div class="wine-photo">${w.photo ? `<img src="${esc(w.photo)}" alt="Фото образца ${esc(w.name)}">` : icon("bottle")}<div class="actions">${btn(icon("camera") + "Фото", "photo-menu", "secondary", w.id)}</div></div><div class="wine-facts"><div class="stats-strip"><div><strong>${fmt(st.max)}</strong><span>максимум</span></div><div><strong>${fmt(st.min)}</strong><span>минимум</span></div><div><strong>${fmt(st.avg)}</strong><span>среднее</span></div></div><dl>${[
      ["Тип", w.type],
      ["Год урожая", w.year || "Без года"],
      ["Дата розлива", w.bottled ? date(w.bottled) : "—"],
      ["Магазин", w.shop || "—"],
      [
        "Цена",
        w.price == null
          ? "—"
          : Number(w.price).toLocaleString("ru-RU", {
              maximumFractionDigits: 2,
            }) + " ₽",
      ],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
      .join(
        "",
      )}</dl>${w.notes ? `<p class="wine-note">${esc(w.notes)}</p>` : ""}<div class="membership">${memberships.map((s) => btn(`${esc(s.name)} · № ${esc(s.entries.find((e) => e.wineId === w.id).number)}`, "set", "chip", s.id)).join("")}</div></div></section><div class="section-title"><h2>История впечатлений</h2>${select("Оценщик", "history-user", [["", "Все оценщики"], ...userOptions()], historyUser, 'id="history-user"')}</div>${ratings.length ? chart(ratings.slice().reverse(), false) + `<div class="history-list">${ratings.map((r) => `<article class="history-row"><span class="history-ball">${r.total}</span><div><b>${esc(getUser(r.userId).name)}</b><small>${date(r.date)} · ${esc(getSet(r.setId).name)} · № ${esc(r.number)}</small><small>${esc(Core.schemas[r.schema].name)}${Core.age(w, r.date) !== null ? " · возраст " + Core.age(w, r.date) + " лет по году урожая" : ""}</small>${r.defect ? `<span class="defect">Дефект: ${esc(r.defect)}</span>` : ""}${r.comment ? `<p>${esc(r.comment)}</p>` : ""}${btn("Показать лист", "rating-detail", "text", r.id)}</div></article>`).join("")}</div>` : empty("Пока без оценок", "Первое впечатление будет началом истории.")}`
  );
}
function chart(ratings, byAge = false) {
  if (!ratings.length) return "";
  const xs = ratings.map((r) =>
    byAge
      ? Core.age(getWine(r.wineId), r.date)
      : Date.parse(r.date + "T12:00:00Z"),
  );
  const min = Math.min(...xs),
    max = Math.max(...xs),
    toX = (x) => 45 + (max === min ? 0.5 : (x - min) / (max - min)) * 810,
    toY = (y) => 155 - (y / 100) * 130;
  let lines = "";
  for (let i = 40; i <= 100; i += 20)
    lines += `<path d="M40 ${toY(i)}H890" stroke="#e8e0db"/><text x="8" y="${toY(i) + 4}">${i}</text>`;
  const groups = byAge ? [...new Set(ratings.map((r) => r.wineId))] : ["all"];
  const palette = ["#782d49", "#b0874c", "#446f66", "#526b91", "#965b32"];
  return `<div class="chart-card"><div class="chart-label">${byAge ? "БАЛЛЫ ПО ВОЗРАСТУ ВИНА" : "ДИНАМИКА ОЦЕНОК"}<span>Каждая точка — отдельная дегустация</span></div><svg viewBox="0 0 930 200" role="img" aria-label="График оценок от 0 до 100">${lines}${groups
    .map((id, i) => {
      const rs = ratings
        .filter((r) => id === "all" || r.wineId === id)
        .sort((a, b) => xs[ratings.indexOf(a)] - xs[ratings.indexOf(b)]);
      return `<polyline points="${rs.map((r) => `${toX(xs[ratings.indexOf(r)])},${toY(r.total)}`).join(" ")}" fill="none" stroke="${palette[i % 5]}" stroke-width="2"/>${rs.map((r) => `<circle cx="${toX(xs[ratings.indexOf(r)])}" cy="${toY(r.total)}" r="5" fill="${palette[i % 5]}"><title>${esc(getWine(r.wineId).name)} ${getWine(r.wineId).year || ""} · ${date(r.date)} · ${r.total} баллов</title></circle>`).join("")}`;
    })
    .join(
      "",
    )}<text x="40" y="190">${byAge ? min + " лет" : date(new Date(min).toISOString().slice(0, 10))}</text><text x="890" y="190" text-anchor="end">${byAge ? max + " лет" : date(new Date(max).toISOString().slice(0, 10))}</text></svg>${byAge ? `<div class="chart-legend">${groups.map((id, i) => `<span style="color:${palette[i % 5]}">● ${esc(getWine(id).producer || getWine(id).name)} ${getWine(id).year || "б/г"}</span>`).join("")}</div>` : ""}</div>`;
}
function peoplePage() {
  return (
    pageHead(
      "ВКУС У КАЖДОГО СВОЙ",
      "Оценщики",
      "Несколько профилей на одном устройстве. История каждого сохраняется.",
      btn(icon("plus") + "Добавить оценщика", "new-user", "primary"),
    ) +
    `<div class="people-grid">${S.users.map((u, i) => `<article class="person-card"><div class="person-avatar color-${i % 3}">${esc(u.name[0].toUpperCase())}</div><h2>${esc(u.name)}</h2><p>${S.ratings.filter((r) => r.userId === u.id).length} оценок</p><div class="actions">${btn(S.settings.userId === u.id ? icon("check") + "Выбран" : "Выбрать", "select-user", S.settings.userId === u.id ? "primary" : "secondary", u.id)}${btn(icon("edit"), "rename-user", "icon", u.id, 'aria-label="Изменить имя"')}</div></article>`).join("")}</div><div class="notice">${icon("info")}<span>В групповой дегустации участники оценивают выбранный сет по очереди. Профили не защищены паролем.</span></div>`
  );
}
function comparePage() {
  const names = [
    ...new Map(S.wines.map((w) => [Core.normalize(w.name), w.name])).entries(),
  ];
  if (!compareName && names.length) compareName = names[0][0];
  const wines = S.wines
    .filter((w) => Core.normalize(w.name) === compareName)
    .sort((a, b) => (a.year || 0) - (b.year || 0));
  const ratings = S.ratings.filter(
    (r) =>
      wines.some((w) => w.id === r.wineId) &&
      (!compareUser || r.userId === compareUser) &&
      (!compareFrom || r.date >= compareFrom) &&
      (!compareTo || r.date <= compareTo),
  );
  const ageRatings = ratings.filter(
    (r) => Core.age(getWine(r.wineId), r.date) !== null,
  );
  return (
    pageHead(
      "ВРЕМЯ МЕНЯЕТ ВКУС",
      "Сравнение вин",
      "Одно название, разные урожаи. Сравните оценки и возраст на дату дегустации.",
    ) +
    (names.length
      ? `<div class="compare-controls">${select("Название вина", "compare-name", names, compareName, 'id="compare-name"')}${select("Оценщик", "compare-user", [["", "Все оценщики"], ...userOptions()], compareUser, 'id="compare-user"')}${input("С даты", "compare-from", compareFrom, "date", 'id="compare-from"')}${input("По дату", "compare-to", compareTo, "date", 'id="compare-to"')}</div>${ageRatings.length ? chart(ageRatings, true) : ""}<div class="table-scroll"><table><thead><tr><th>Урожай / производитель</th><th>Среднее</th><th>Мин — макс</th><th>Оценок</th><th>Возраст при оценке</th></tr></thead><tbody>${wines
          .map((w) => {
            const rs = ratings.filter((r) => r.wineId === w.id),
              st = Core.stats(rs),
              ages = [
                ...new Set(
                  rs.map((r) => Core.age(w, r.date)).filter((x) => x !== null),
                ),
              ].sort((a, b) => a - b);
            return `<tr><td><button class="table-link" data-action="wine" data-id="${w.id}"><b>${w.year || "Без года"}</b><small>${esc(w.producer || w.name)}</small></button></td><td class="accent">${fmt(st.avg)}</td><td>${fmt(st.min)} — ${fmt(st.max)}</td><td>${st.count}</td><td>${ages.length ? ages.join(", ") + " лет" : "—"}</td></tr>`;
          })
          .join(
            "",
          )}</tbody></table></div><p class="footnote">Возраст рассчитан как год дегустации минус год урожая. Даты, авторы и точные баллы доступны в карточке вина. Разные схемы и состав оценщиков могут влиять на сравнение.</p>${
          ratings.length
            ? `<div class="section-title"><h2>Дегустации по датам</h2></div><div class="table-scroll"><table><thead><tr><th>Дата</th><th>Урожай</th><th>Возраст</th><th>Оценщик</th><th>Баллы</th></tr></thead><tbody>${ratings
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(
                  (r) =>
                    `<tr><td>${date(r.date)}</td><td>${getWine(r.wineId).year || "—"}</td><td>${Core.age(getWine(r.wineId), r.date) ?? "—"}</td><td>${esc(getUser(r.userId).name)}</td><td>${r.total}</td></tr>`,
                )
                .join("")}</tbody></table></div>`
            : ""
        }`
      : empty(
          "Время ещё расскажет свою историю",
          "Добавьте в коллекцию вина одного названия разных лет.",
        ))
  );
}
function settingsPage() {
  return (
    pageHead(
      "ВАШ ДНЕВНИК",
      "Настройки",
      "Режим дегустации, резервные копии и правила оценки.",
    ) +
    `${loadError ? `<div class="notice error">Сохранённый файл не прочитан: ${esc(loadError)}. Автозапись отключена, чтобы сохранить исходный файл. Экспортируйте его перед восстановлением.</div>` : ""}<div class="settings-grid"><section class="panel"><h2>Режим дегустации</h2><p>Сейчас: ${S.settings.mode === "group" ? "в компании" : "личная дегустация"}</p>${btn("Выбрать режим", "mode", "secondary")}<h2>Данные и резервные копии</h2><p>Сеты, оценки и фотографии хранятся на этом устройстве. Полная копия JSON позволяет перенести дневник на другое устройство.</p><div class="actions">${btn(icon("download") + "Сохранить копию", "backup", "primary")}${btn(icon("upload") + "Восстановить", "restore", "secondary")}</div><p class="footnote">Восстановление заменяет текущий дневник. CSV предназначен для таблиц; полную историю и фотографии переносит JSON.</p></section><section class="panel"><h2>Конкурсный лист</h2><p>Выбирайте один балл в каждой строке. Итог — сумма выбранных значений, максимум 100. Лист сохраняется вместе с оценкой.</p><ul><li>OIV 2025: отдельные листы для тихих и игристых вин.</li><li>Классический OIV: привычные разделы «Внешний вид», «Аромат», «Вкус», «Гармония».</li></ul><p>В результатах отмечаются первые три места с учётом равных баллов. Это места внутри вашего сета. В группе сначала усредняются повторные оценки каждого участника, затем — оценки участников.</p><p class="footnote">Источники шкал: OIV-OENO 671A-2025, приложения 3.1–3.2 (oiv.int/node/4087); OIV/CONCOURS 332A/2009 (oiv.int/node/3463). Приложение не является официальным продуктом OIV.</p><h2>Android TV</h2><p>Стрелки пульта перемещают фокус, OK выбирает, «Назад» возвращает. Для ввода текста используется экранная клавиатура. Камера и выбор файлов доступны при наличии соответствующих приложений на устройстве.</p><p class="footnote">Дегустационный лист · версия 1.0.0 · Android 8.0+</p></section></div>`
  );
}
function start(setId, wineId = "") {
  const set = getSet(setId);
  if (!set || !set.entries.length) {
    notify("Сначала добавьте в сет хотя бы одно вино");
    return;
  }
  const a = active();
  if (S.settings.mode === "group" && (!a || a.setId !== setId)) {
    sessionSetup(setId);
    return;
  }
  const group = S.settings.mode === "group" ? a : null;
  modalBox(
    group ? "Передайте устройство оценщику" : "Новая дегустация",
    `<form id="start-form" data-set="${setId}" data-session="${group?.id || ""}"><p>${group ? "Оценки участников сохраняются отдельно. До отправки лист виден только текущему оценщику." : "Выберите образец, дату и вид дегустационного листа."}</p>${select("Оценщик", "userId", group ? group.userIds.map((id) => [id, getUser(id).name]) : userOptions(), S.settings.userId)}${select(
      "Образец",
      "wineId",
      set.entries.map((e) => [
        e.wineId,
        group?.blind
          ? "Образец № " + e.number
          : "№ " + e.number + " · " + getWine(e.wineId).name,
      ]),
      wineId || set.entries[0].wineId,
    )}${
      group
        ? `<div class="notice"><span>${date(group.date)} · ${esc(Core.schemas[group.schema].name)}<br>${group.blind ? "Слепая дегустация" : "Название и номер вина"}</span></div>`
        : `${input("Дата дегустации", "date", Core.today(), "date", 'required max="' + Core.today() + '"')}${select("Дегустационный лист", "schema", schemaOptions(), "oiv2025-still")}${select(
            "Показ образца",
            "blind",
            [
              ["true", "Вслепую — только номер"],
              ["false", "Название и номер вина"],
            ],
            "true",
          )}`
    }<div class="form-error" role="alert"></div><div class="actions">${btn("Отмена", "close")}<button class="btn primary" type="submit">${icon("glass")}Открыть лист</button></div></form>`,
  );
}
function sessionSetup(setId) {
  modalBox(
    "Дегустация в компании",
    `<form id="session-form" data-set="${setId}"><p>Сет: <b>${esc(getSet(setId).name)}</b>. Все участники оценивают один сет на одном устройстве.</p><fieldset><legend>Участники · выберите минимум двоих</legend>${S.users.map((u, i) => `<label class="check-field"><input type="checkbox" name="participants" value="${u.id}" ${i < 2 ? "checked" : ""}><span>${esc(u.name)}</span></label>`).join("")}</fieldset>${btn(icon("plus") + "Добавить оценщика", "session-user", "text", setId)}${input("Дата дегустации", "date", Core.today(), "date", 'required max="' + Core.today() + '"')}${select("Дегустационный лист", "schema", schemaOptions(), "oiv2025-still")}${select(
      "Показ образцов",
      "blind",
      [
        ["true", "Вслепую — только номера"],
        ["false", "Название и номер вина"],
      ],
      "true",
    )}${active() ? '<p class="footnote">Текущая групповая сессия будет завершена. Все её оценки останутся в истории.</p>' : ""}<div class="form-error" role="alert"></div><div class="actions">${btn("Отмена", "close")}<button class="btn primary" type="submit">Начать дегустацию</button></div></form>`,
  );
}
function draftKey(c) {
  return [
    c.sessionId || "solo",
    c.setId,
    c.wineId,
    c.userId,
    c.schema,
    c.blind,
  ].join(":");
}
function openRating(c) {
  ratingContext = c;
  const saved = S.drafts[draftKey(c)];
  draft =
    saved && saved.date === c.date
      ? { ...saved, scores: { ...saved.scores } }
      : { scores: {}, comment: "", defect: "", date: c.date };
  closeModal();
  go("rating", c.wineId);
}
function saveDraft() {
  if (!ratingContext || !draft) return;
  const c = $("[name=comment]");
  if (c) draft.comment = c.value;
  const d = $("[name=defect]");
  if (d) draft.defect = d.value;
  commit((s) => {
    s.drafts[draftKey(ratingContext)] = {
      ...draft,
      scores: { ...draft.scores },
    };
  }, false);
}
function ratingPage() {
  if (!ratingContext || !draft) {
    screen = { name: "sets" };
    return home();
  }
  const c = ratingContext,
    set = getSet(c.setId),
    w = getWine(c.wineId),
    number = set.entries.find((e) => e.wineId === w.id).number,
    schema = Core.schemas[c.schema];
  let last = "";
  return `<div class="breadcrumbs">${btn(icon("back") + "Выйти из листа", "back", "text")}</div><div class="sheet-head"><div><span class="eyebrow">${c.blind ? "СЛЕПАЯ ДЕГУСТАЦИЯ" : "ДЕГУСТАЦИОННЫЙ ЛИСТ"}</span><h1>${c.blind ? "Образец № " + esc(number) : esc(w.name)}</h1><p class="sub">${esc(getUser(c.userId).name)} · ${date(c.date)}${c.blind ? "" : " · № " + esc(number)}</p></div><div class="blind-badge">${icon(c.blind ? "blind" : "eye")}<span>${c.blind ? "Только номер образца" : "Название и номер"}</span></div></div><div class="sheet-layout"><section class="tasting-sheet"><div class="sheet-title"><b>${esc(schema.name)}</b>${btn(icon("info"), "sheet-info", "icon", "", 'aria-label="Как оценивать"')}</div><div class="scale-guide"><span>Отлично</span><span>Слабо</span></div>${schema.rows
    .map((r) => {
      let head = "";
      if (last !== r.group) {
        last = r.group;
        head = `<h2 class="criterion-group">${r.group}</h2>`;
      }
      return (
        head +
        `<div class="criterion"><div class="criterion-label"><b>${r.title}</b><small>${r.hint}</small></div><div class="point-options" role="radiogroup" aria-label="${r.group}: ${r.title}">${r.values.map((v, i) => `<button type="button" role="radio" aria-checked="${draft.scores[r.id] === v}" class="point ${draft.scores[r.id] === v ? "picked" : ""}" data-action="score" data-row="${r.id}" data-value="${v}" aria-label="${v} баллов, ${["отлично", "очень хорошо", "хорошо", "удовлетворительно", "слабо"][i]}"><span class="radio-dot"></span><b>${v}</b></button>`).join("")}</div></div>`
      );
    })
    .join(
      "",
    )}<div class="comment-area"><label class="field"><span>Комментарий</span><textarea name="comment" rows="4" maxlength="10000" placeholder="Ароматы, вкус, текстура, послевкусие…">${esc(draft.comment)}</textarea></label>${input("Дефект (если есть)", "defect", draft.defect, "text", 'maxlength="200" placeholder="Например, пробковый тон"')}</div></section><aside class="score-panel"><span class="eyebrow">ВАШЕ ВПЕЧАТЛЕНИЕ</span><div class="total-score"><b id="total">${Core.total(c.schema, draft.scores, false)}</b><span>/ 100</span></div><div class="score-progress"><i id="score-progress" style="width:${(Object.keys(draft.scores).length / schema.rows.length) * 100}%"></i></div><p id="filled-count">Выбрано ${Object.keys(draft.scores).length} из ${schema.rows.length} критериев</p><p class="score-hint">Одна отметка в каждой строке.<br>Итог рассчитывается автоматически.</p>${btn(icon("check") + "Отправить оценку", "submit-rating", "primary")}<small>Черновик сохраняется автоматически</small></aside></div><div class="mobile-score"><span><b id="mobile-total">${Core.total(c.schema, draft.scores, false)}</b> / 100 <small id="mobile-count">${Object.keys(draft.scores).length}/${schema.rows.length}</small></span>${btn("Отправить " + icon("check"), "submit-rating", "primary")}</div>`;
}
function submitRating() {
  try {
    const c = ratingContext;
    const sum = Core.total(c.schema, draft.scores);
    saveDraft();
    const number = getSet(c.setId).entries.find(
      (e) => e.wineId === c.wineId,
    ).number;
    const rating = {
      id: Core.id(),
      ...c,
      number,
      scores: { ...draft.scores },
      total: sum,
      comment: draft.comment,
      defect: draft.defect.trim(),
      createdAt: new Date().toISOString(),
    };
    if (
      commit((s) => {
        s.ratings.push(rating);
        delete s.drafts[draftKey(c)];
        s.settings.userId = c.userId;
      }, false)
    ) {
      ratingContext = null;
      draft = null;
      screen = { name: "set", id: c.setId };
      stack = [{ name: "sets" }];
      render();
      modalBox(
        "Впечатление сохранено",
        `<div class="success-mark">${icon("check")}</div><div class="saved-score">${sum}<small> / 100</small></div><p class="center">Оценщик: ${esc(getUser(c.userId).name)}<br>Образец № ${esc(number)} · ${date(c.date)}</p><div class="actions center">${btn(c.sessionId ? "Следующий оценщик" : "Оценить ещё", "start", "primary", c.setId)}${btn("Результаты", "results", "secondary", c.setId)}${btn("К сету", "close", "text")}</div>`,
      );
    }
  } catch (e) {
    notify(e.message);
    [...document.querySelectorAll(".point-options")]
      .find((el) => !el.querySelector(".picked"))
      ?.querySelector("button")
      ?.focus();
  }
}
function resultsPage() {
  const set = getSet(screen.id);
  if (!set) return "";
  const sessions = S.sessions
    .filter((x) => x.setId === set.id)
    .slice()
    .reverse();
  const session = S.sessions.find((x) => x.id === resultsSession);
  const board = Core.leaderboard(
    S,
    set.id,
    session?.id || null,
    resultsUser || null,
  );
  const scored = board.filter((r) => r.count && !r.eliminated);
  const complete = session
    ? session.userIds.every((uid) =>
        session.entries.every((e) =>
          S.ratings.some(
            (r) =>
              r.sessionId === session.id &&
              r.userId === uid &&
              r.wineId === e.wineId,
          ),
        ),
      )
    : true;
  return (
    `<div class="breadcrumbs">${btn(icon("back") + "К сету", "set", "text", set.id)}</div>` +
    pageHead(
      "ИТОГИ ДЕГУСТАЦИИ",
      set.name,
      "Результаты, участники и лучшие впечатления.",
      btn(
        icon("download") + "Экспорт CSV",
        "export-menu",
        "secondary",
        set.id,
      ) +
        (session?.status === "active"
          ? btn("Завершить сессию", "finish-session", "primary", session.id)
          : ""),
    ) +
    `<div class="results-controls">${select("Дегустация", "result-session", [["", "Все оценки сета"], ...sessions.map((x) => [x.id, date(x.date) + " · " + x.userIds.length + " участника" + (x.status === "active" ? " · идёт" : "")])], resultsSession || "", 'id="result-session"')}${select("Оценщик", "result-user", [["", "Все оценщики"], ...(session ? session.userIds.map((id) => [id, getUser(id).name]) : userOptions())], resultsUser, 'id="result-user"')}</div>${
      session
        ? `<section class="panel session-progress"><h2>Участники ${complete ? "· все образцы оценены" : "· дегустация продолжается"}</h2>${session.userIds
            .map((id) => {
              const n = new Set(
                S.ratings
                  .filter((r) => r.sessionId === session.id && r.userId === id)
                  .map((r) => r.wineId),
              ).size;
              return `<div><span>${esc(getUser(id).name)}</span><b>${n} / ${session.entries.length}</b></div>`;
            })
            .join("")}</section>`
        : ""
    }${
      scored.length
        ? `<div class="section-title"><h2>${complete ? "Лучшие вина сета" : "Предварительные лидеры"}</h2><span>По среднему баллу</span></div><div class="podium">${scored
            .filter((r) => r.rank <= 3)
            .map(
              (r) =>
                `<article class="winner rank-${r.rank}"><span class="winner-rank">${icon("cup")} ${r.rank} место</span><b>${esc(r.wine.name)}</b><small>№ ${esc(r.number)} · ${r.wine.year || "Без года"}</small><strong>${fmt(r.avg)}<small> / 100</small></strong></article>`,
            )
            .join("")}</div>`
        : ""
    }<div class="table-scroll"><table><thead><tr><th>Место</th><th>Образец</th><th>Вино</th><th>Среднее</th><th>Мин — макс</th><th>Оценок / авторов</th></tr></thead><tbody>${board.map((r) => `<tr><td>${r.eliminated ? "Дефект" : r.rank || "—"}</td><td>№ ${esc(r.number)}</td><td><button class="table-link" data-action="wine" data-id="${r.wineId}">${esc(r.wine.name)}<small>${r.wine.year || "Без года"}</small></button></td><td class="accent">${fmt(r.avg)}</td><td>${fmt(r.min)} — ${fmt(r.max)}</td><td>${r.count} / ${r.users}</td></tr>`).join("")}</tbody></table></div><p class="footnote">${session ? "Итог — среднее индивидуальных средних баллов участников. Если два разных оценщика отметили дефект, образец исключается из призовых мест." : "Итог — среднее всех оценок в выбранном фильтре."} Первые три места относятся только к этому сету; равные баллы дают равное место. Экспорт учитывает выбранную сессию и включает всех её оценщиков.</p>`
  );
}
function newSet(id) {
  const s = id ? getSet(id) : null;
  modalBox(
    s ? "Изменить сет" : "Новый сет",
    `<form id="set-form" data-id="${id || ""}">${input("Название сета", "name", s?.name || "", "text", 'required maxlength="200" placeholder="Например, Рислинги: вертикальная дегустация"')}${input("Описание", "description", s?.description || "", "text", 'maxlength="300" placeholder="Регион, тема или повод"')}${input("Дата сета", "date", s?.date || Core.today(), "date", "required")}${s?.entries.length ? `<fieldset><legend>Номера образцов в сете</legend>${s.entries.map((e) => input(esc(getWine(e.wineId).name), "sample-" + e.wineId, e.number, "text", 'required maxlength="40" ' + (active()?.setId === s.id ? "disabled" : ""))).join("")}</fieldset>` : ""}<div class="form-error" role="alert"></div><div class="actions">${btn("Отмена", "close")}<button class="btn primary" type="submit">Сохранить сет</button></div></form>`,
  );
}
function wineForm(setId, wineId) {
  const w = wineId ? getWine(wineId) : null;
  photo = w?.photo || "";
  modalBox(
    w ? "Изменить вино" : "Добавить вино",
    `<form id="wine-form" data-set="${setId || ""}" data-id="${wineId || ""}"><div class="form-grid">${input("Название вина", "name", w?.name || "", "text", 'required maxlength="200"')}${!w ? input("Номер образца в сете", "number", Core.nextNumber(getSet(setId)), "text", 'required maxlength="40"') : ""}${input("Производитель", "producer", w?.producer || "", "text", 'maxlength="200"')}${input("Год урожая", "year", w?.year || "", "number", 'min="1800" max="' + (new Date().getFullYear() + 1) + '" step="1"')}${select(
      "Тип вина",
      "type",
      [
        ["Тихое", "Тихое"],
        ["Игристое", "Игристое"],
        ["Другое", "Другое"],
      ],
      w?.type || "Тихое",
    )}${input("Дата розлива", "bottled", w?.bottled || "", "date")}${input("Магазин", "shop", w?.shop || "", "text", 'maxlength="200"')}${input("Цена, ₽", "price", w?.price ?? "", "number", 'min="0" step="0.01"')}</div><label class="field"><span>Заметки о вине</span><textarea name="notes" rows="2" maxlength="2000">${esc(w?.notes || "")}</textarea></label><div class="photo-form"><span id="photo-state">${photo ? "Фото добавлено" : "Фото образца"}</span><div class="actions">${btn(icon("upload") + "Галерея", "form-photo", "secondary", "gallery")}${btn(icon("camera") + "Камера", "form-photo", "secondary", "camera")}${btn("Убрать", "clear-photo", "text")}</div></div>${w ? '<p class="footnote">Изменения карточки будут видны во всех сетах, в которые включено это вино.</p>' : ""}<div class="form-error" role="alert"></div><div class="actions">${btn("Отмена", "close")}<button type="submit" class="btn primary">Сохранить вино</button></div></form>`,
    true,
  );
}
function addMenu(setId) {
  modalBox(
    "Добавить образцы",
    `<div class="menu-options">${btn(icon("edit") + "Ввести новое вино вручную", "new-wine", "menu-option", setId)}${btn(icon("bottle") + "Выбрать из коллекции", "existing-wines", "menu-option", setId)}${btn(icon("upload") + "Загрузить вина из CSV", "import-csv", "menu-option", setId)}</div><p class="footnote">Вино из коллекции сохраняет всю историю. В новом сете ему назначается собственный номер.</p>`,
  );
}
function existingWines(setId) {
  const set = getSet(setId),
    wines = S.wines.filter((w) => !set.entries.some((e) => e.wineId === w.id));
  modalBox(
    "Из коллекции в сет",
    wines.length
      ? `<form id="existing-form" data-set="${setId}"><p>Отметьте вина. Номера образцов назначаются автоматически; их можно изменить в сете.</p><div class="existing-options">${wines.map((w) => `<label class="check-field"><input type="checkbox" name="wines" value="${w.id}"><span><b>${esc(w.name)}</b><small>${esc([w.producer, w.year].filter(Boolean).join(" · "))}</small></span></label>`).join("")}</div><div class="form-error" role="alert"></div><button type="submit" class="btn primary">Добавить выбранные</button></form>`
      : empty("Все вина уже в сете", "Добавьте новое вино вручную или из CSV."),
    true,
  );
}
function exportMenu(setId) {
  const s =
    screen.name === "results"
      ? S.sessions.find((x) => x.id === resultsSession && x.setId === setId)
      : null;
  modalBox(
    "Экспорт в CSV",
    `<p>${s ? "Выбрана сессия " + date(s.date) + "." : "Все оценки выбранного сета."} Файл в UTF-8, разделитель — точка с запятой.</p><div class="menu-options">${btn("Итоговая таблица результатов", "export-summary", "menu-option", setId)}${btn("Все оценки с критериями и комментариями", "export-ratings", "menu-option", setId)}${btn("Список вин (можно импортировать обратно)", "export-wines", "menu-option", setId)}</div>`,
  );
}
function userForm(id = "", sessionSet = "") {
  const u = id ? getUser(id) : null;
  modalBox(
    u ? "Имя оценщика" : "Новый оценщик",
    `<form id="user-form" data-id="${id}" data-session-set="${sessionSet}">${input("Имя", "name", u?.name || "", "text", 'required maxlength="100"')}<div class="form-error" role="alert"></div><button class="btn primary" type="submit">Сохранить</button></form>`,
  );
}
function exportFile(name, mime, text) {
  if (native) Android.exportFile(name, mime, text);
  else {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Файл подготовлен");
  }
}
function pickFile(kind, setId = "") {
  App.pendingImport = { kind, setId };
  if (native) Android.pickFile(kind);
  else {
    const input = $("#web-file");
    input.value = "";
    input.accept =
      kind === "restore"
        ? ".json,application/json"
        : ".csv,text/csv,text/plain";
    input.onchange = async () => {
      if (input.files[0]) App.nativeResult(kind, await input.files[0].text());
    };
    input.click();
  }
}
function pickPhoto(source, target) {
  App.photoTarget = target;
  if (native) Android.pickPhoto(source);
  else {
    const input = $("#web-file");
    input.value = "";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.onchange = () => {
      if (!input.files[0]) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 1200 / Math.max(img.width, img.height)),
            canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas
            .getContext("2d")
            .drawImage(img, 0, 0, canvas.width, canvas.height);
          App.nativeResult("photo", canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(input.files[0]);
    };
    input.click();
  }
}
function example() {
  const sid = Core.id();
  if (
    commit((s) => {
      const wines = [
        ["Рислинг Резерв", "Винодельня у реки", 2020, 1820],
        ["Рислинг Резерв", "Винодельня у реки", 2022, 1540],
        ["Шардоне. Холмы", "Винодельня у реки", 2021, 1690],
        ["Совиньон Блан", "Северный склон", 2023, 1450],
      ].map(([name, producer, year, price]) => ({
        id: Core.id(),
        name,
        producer,
        year,
        price,
        type: "Тихое",
        shop: "Учебный пример",
        bottled: "",
        notes: "Демонстрационный образец. Данные вымышлены.",
        photo: "",
        createdAt: new Date().toISOString(),
      }));
      s.wines.push(...wines);
      s.sets.push({
        id: sid,
        name: "Пример · Белые вина",
        description: "Учебная дегустация · вымышленные образцы",
        date: Core.today(),
        entries: wines.map((w, i) => ({ wineId: w.id, number: String(i + 1) })),
      });
      [0, 1, 2].forEach((i) => {
        const scores = {};
        Core.schemas["oiv2025-still"].rows.forEach(
          (r, j) =>
            (scores[r.id] =
              r.values[Math.min(r.values.length - 1, (i + j) % 3)]),
        );
        s.ratings.push({
          id: Core.id(),
          setId: sid,
          wineId: wines[i].id,
          userId: s.settings.userId,
          number: String(i + 1),
          date: Core.today(),
          schema: "oiv2025-still",
          scores,
          total: Core.total("oiv2025-still", scores),
          comment: "Учебная запись: свежесть, цитрус и лёгкая минеральность.",
          defect: "",
          sessionId: null,
          blind: false,
          createdAt: new Date().toISOString(),
        });
      });
    })
  ) {
    notify("Добавлен учебный сет с вымышленными данными");
  }
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action,
    id = el.dataset.id;
  try {
    if (a === "close") {
      closeModal();
      return;
    }
    if (a === "confirm") {
      const fn = modal?.confirm;
      closeModal();
      fn?.();
      return;
    }
    if (a === "nav") {
      closeModal();
      nav(id);
      return;
    }
    if (a === "back") {
      back();
      return;
    }
    if (a === "mode") {
      leaveRating();
      modalBox(
        "Как будем дегустировать?",
        `<p>Режим можно менять в любое время. Все оценки и активная групповая сессия сохранятся.</p><div class="menu-options">${btn(icon("glass") + "Личная дегустация", "choose-mode", "menu-option", "solo")}${btn(icon("people") + "В компании", "choose-mode", "menu-option", "group")}</div>`,
      );
      return;
    }
    if (a === "choose-mode") {
      if (
        commit((s) => {
          s.settings.mode = id;
        }, false)
      ) {
        closeModal();
        screen = { name: "sets" };
        stack = [];
        render();
      }
      return;
    }
    if (a === "new-set" || a === "edit-set") {
      newSet(a === "edit-set" ? id : null);
      return;
    }
    if (a === "set") {
      closeModal();
      go("set", id);
      return;
    }
    if (a === "add-menu") {
      if (active()?.setId === id) {
        notify("Завершите групповую сессию перед изменением состава сета");
        return;
      }
      addMenu(id);
      return;
    }
    if (a === "new-wine") {
      wineForm(id);
      return;
    }
    if (a === "edit-wine") {
      wineForm("", id);
      return;
    }
    if (a === "existing-wines") {
      existingWines(id);
      return;
    }
    if (a === "import-csv") {
      closeModal();
      pickFile("csv", id);
      return;
    }
    if (a === "apply-import") {
      if (!importRows) return;
      const rows = importRows.rows,
        setId = importRows.setId;
      if (
        commit((s) => {
          for (const row of rows) {
            s.wines.push(row.wine);
            s.sets
              .find((x) => x.id === setId)
              .entries.push({ wineId: row.wine.id, number: row.number });
          }
        }, false)
      ) {
        closeModal();
        importRows = null;
        screen = { name: "set", id: setId };
        render();
        notify("Добавлено вин: " + rows.length);
      }
      return;
    }
    if (a === "filter") {
      filter = id;
      render();
      return;
    }
    if (a === "wine") {
      historyUser = "";
      go("wine", id);
      return;
    }
    if (a === "start") {
      closeModal();
      start(id);
      return;
    }
    if (a === "rate-wine") {
      start(el.dataset.set, id);
      return;
    }
    if (a === "rate-catalogue") {
      const sets = S.sets.filter((s) => s.entries.some((e) => e.wineId === id));
      if (
        S.settings.mode === "group" &&
        active() &&
        getSet(active().setId).entries.some((e) => e.wineId === id)
      )
        start(active().setId, id);
      else if (sets.length === 1) start(sets[0].id, id);
      else
        modalBox(
          "Из какого сета оценить?",
          `<div class="menu-options">${sets.map((s) => btn(esc(s.name), "rate-from-set", "menu-option", id, `data-set="${s.id}"`)).join("")}</div>`,
        );
      return;
    }
    if (a === "rate-from-set") {
      start(el.dataset.set, id);
      return;
    }
    if (a === "score") {
      const v = Number(el.dataset.value),
        row = el.dataset.row;
      draft.scores[row] = v;
      el.closest(".point-options")
        .querySelectorAll("button")
        .forEach((b) => {
          const picked = Number(b.dataset.value) === v;
          b.classList.toggle("picked", picked);
          b.setAttribute("aria-checked", String(picked));
        });
      const n = Object.keys(draft.scores).length,
        total = Core.total(ratingContext.schema, draft.scores, false),
        len = Core.schemas[ratingContext.schema].rows.length;
      $("#total").textContent = total;
      $("#mobile-total").textContent = total;
      $("#filled-count").textContent = `Выбрано ${n} из ${len} критериев`;
      $("#mobile-count").textContent = `${n}/${len}`;
      $("#score-progress").style.width = (n / len) * 100 + "%";
      saveDraft();
      return;
    }
    if (a === "submit-rating") {
      submitRating();
      return;
    }
    if (a === "sheet-info") {
      modalBox(
        "Как заполнить лист",
        `<p>Выберите одну отметку в каждой строке. Слева находятся наибольшие баллы, справа — наименьшие. Под каждым критерием приведена подсказка.</p><p>Перед отправкой нужно заполнить все строки. Комментарий и указание дефекта необязательны.</p><p>Черновик привязан к образцу, оценщику и виду листа. Повторная отправка создаёт новую оценку с отдельной датой.</p>`,
      );
      return;
    }
    if (a === "results") {
      closeModal();
      resultsSession = active()?.setId === id ? active().id : null;
      resultsUser = "";
      go("results", id);
      return;
    }
    if (a === "finish-session") {
      const session = S.sessions.find((x) => x.id === id);
      confirmBox(
        "Завершить дегустацию?",
        "Все оценки останутся в истории. Новые оценки можно будет добавить в следующей сессии. Неоценённые образцы останутся без баллов.",
        () => {
          commit((s) => {
            s.sessions.find((x) => x.id === id).status = "closed";
            if (s.settings.activeSession === id)
              s.settings.activeSession = null;
          });
        },
      );
      return;
    }
    if (a === "export-menu") {
      exportMenu(id);
      return;
    }
    if (a.startsWith("export-")) {
      const session =
        screen.name === "results"
          ? S.sessions.find((x) => x.id === resultsSession && x.setId === id)
          : null;
      const scope = session?.id || null;
      if (a === "export-summary")
        exportFile(
          "Degustation-results-" + Core.today() + ".csv",
          "text/csv",
          Core.resultCSV(S, id, scope),
        );
      if (a === "export-ratings")
        exportFile(
          "Degustation-ratings-" + Core.today() + ".csv",
          "text/csv",
          Core.ratingsCSV(S, id, scope),
        );
      if (a === "export-wines")
        exportFile(
          "Degustation-wines-" + Core.today() + ".csv",
          "text/csv",
          Core.wineCSV(S, id),
        );
      return;
    }
    if (a === "new-user") {
      userForm();
      return;
    }
    if (a === "rename-user") {
      userForm(id);
      return;
    }
    if (a === "session-user") {
      userForm("", id);
      return;
    }
    if (a === "select-user") {
      if (
        commit((s) => {
          s.settings.userId = id;
        })
      ) {
        notify("Выбран оценщик: " + getUser(id).name);
      }
      return;
    }
    if (a === "pick-user" && screen.name === "rating") {
      notify("Оценщик указан в открытом листе. Для смены выйдите из листа.");
      return;
    }
    if (a === "pick-user") {
      modalBox(
        "Текущий оценщик",
        `<div class="menu-options">${S.users.map((u) => btn(esc(u.name) + (u.id === S.settings.userId ? " ✓" : ""), "switch-user", "menu-option", u.id)).join("")}</div>`,
      );
      return;
    }
    if (a === "switch-user") {
      commit((s) => {
        s.settings.userId = id;
      });
      closeModal();
      return;
    }
    if (a === "photo-menu") {
      modalBox(
        "Фото образца",
        `<div class="menu-options">${btn(icon("upload") + "Выбрать из галереи", "wine-photo", "menu-option", id, 'data-source="gallery"')}${btn(icon("camera") + "Сфотографировать", "wine-photo", "menu-option", id, 'data-source="camera"')}${getWine(id).photo ? btn("Удалить фото", "remove-wine-photo", "menu-option", id) : ""}</div>`,
      );
      return;
    }
    if (a === "wine-photo") {
      closeModal();
      pickPhoto(el.dataset.source, { wineId: id });
      return;
    }
    if (a === "remove-wine-photo") {
      commit((s) => (s.wines.find((x) => x.id === id).photo = ""));
      closeModal();
      return;
    }
    if (a === "form-photo") {
      pickPhoto(id, { form: true });
      return;
    }
    if (a === "clear-photo") {
      photo = "";
      $("#photo-state").textContent = "Фото образца";
      return;
    }
    if (a === "backup") {
      exportFile(
        "Degustation-backup-" + Core.today() + ".json",
        "application/json",
        loadError
          ? native
            ? Android.readState()
            : localStorage.getItem("degustation")
          : JSON.stringify(S, null, 2),
      );
      return;
    }
    if (a === "restore") {
      pickFile("restore");
      return;
    }
    if (a === "example") {
      confirmBox(
        "Добавить учебный пример?",
        "Будет добавлен отдельный сет с четырьмя вымышленными винами и тремя учебными оценками.",
        example,
      );
      return;
    }
    if (a === "rating-detail") {
      const r = S.ratings.find((x) => x.id === id);
      modalBox(
        "Сохранённый лист · " + r.total + " / 100",
        `<p>${esc(getUser(r.userId).name)} · ${date(r.date)}<br>${esc(Core.schemas[r.schema].name)}</p><dl class="rating-breakdown">${Core.schemas[r.schema].rows.map((row) => `<div><dt>${row.group} · ${row.title}</dt><dd>${r.scores[row.id]} / ${row.values[0]}</dd></div>`).join("")}</dl>${r.comment ? `<p>${esc(r.comment)}</p>` : ""}${r.defect ? `<p>Дефект: ${esc(r.defect)}</p>` : ""}`,
        true,
      );
      return;
    }
  } catch (error) {
    notify(error.message);
  }
});
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target,
    fd = new FormData(form),
    v = (k) => String(fd.get(k) || "").trim(),
    err = (t) => {
      form.querySelector(".form-error").textContent = t;
    };
  try {
    if (form.id === "set-form") {
      if (!v("name") || !Core.validDate(v("date")))
        throw Error("Укажите название и корректную дату");
      const id = form.dataset.id || Core.id();
      if (
        commit((s) => {
          const set = s.sets.find((x) => x.id === id);
          if (set) {
            set.name = v("name");
            set.description = v("description");
            set.date = v("date");
            if (active()?.setId !== set.id)
              for (const entry of set.entries)
                entry.number = v("sample-" + entry.wineId);
          } else
            s.sets.push({
              id,
              name: v("name"),
              description: v("description"),
              date: v("date"),
              entries: [],
            });
        }, false)
      ) {
        closeModal();
        screen = { name: "set", id };
        stack = [{ name: "sets" }];
        render();
      }
    }
    if (form.id === "wine-form") {
      const wineId = form.dataset.id || Core.id(),
        setId = form.dataset.set;
      const wine = {
        ...(getWine(wineId) || {}),
        id: wineId,
        name: v("name"),
        producer: v("producer"),
        year: v("year") ? Number(v("year")) : null,
        bottled: v("bottled"),
        shop: v("shop"),
        price: v("price") ? Number(v("price")) : null,
        type: v("type"),
        notes: v("notes"),
        photo,
        createdAt: getWine(wineId)?.createdAt || new Date().toISOString(),
      };
      Core.validateWine(wine);
      if (
        !form.dataset.id &&
        getSet(setId).entries.some(
          (e) => Core.normalize(e.number) === Core.normalize(v("number")),
        )
      )
        throw Error("Этот номер образца уже есть в сете");
      if (
        commit((s) => {
          if (form.dataset.id)
            s.wines[s.wines.findIndex((x) => x.id === wineId)] = wine;
          else {
            s.wines.push(wine);
            s.sets
              .find((x) => x.id === setId)
              .entries.push({ wineId, number: v("number") });
          }
        }, false)
      ) {
        closeModal();
        render();
        notify("Вино сохранено");
      }
    }
    if (form.id === "existing-form") {
      const ids = fd.getAll("wines");
      if (!ids.length) throw Error("Выберите хотя бы одно вино");
      if (
        commit((s) => {
          const set = s.sets.find((x) => x.id === form.dataset.set);
          for (const wineId of ids)
            set.entries.push({ wineId, number: Core.nextNumber(set) });
        }, false)
      ) {
        closeModal();
        render();
      }
    }
    if (form.id === "user-form") {
      if (!v("name")) throw Error("Введите имя");
      if (
        S.users.some(
          (u) =>
            u.id !== form.dataset.id &&
            Core.normalize(u.name) === Core.normalize(v("name")),
        )
      )
        throw Error("Оценщик с таким именем уже существует");
      if (
        commit((s) => {
          if (form.dataset.id)
            s.users.find((x) => x.id === form.dataset.id).name = v("name");
          else s.users.push({ id: Core.id(), name: v("name") });
        }, false)
      ) {
        const setId = form.dataset.sessionSet;
        closeModal();
        render();
        if (setId) sessionSetup(setId);
      }
    }
    if (form.id === "session-form") {
      const users = fd.getAll("participants");
      if (users.length < 2) throw Error("Выберите минимум двух оценщиков");
      if (!Core.validDate(v("date")) || v("date") > Core.today())
        throw Error("Укажите дату не позднее сегодняшней");
      const session = {
        id: Core.id(),
        setId: form.dataset.set,
        userIds: users,
        date: v("date"),
        schema: v("schema"),
        blind: v("blind") === "true",
        status: "active",
        entries: JSON.parse(JSON.stringify(getSet(form.dataset.set).entries)),
        createdAt: new Date().toISOString(),
      };
      if (
        commit((s) => {
          if (s.settings.activeSession)
            s.sessions.find((x) => x.id === s.settings.activeSession).status =
              "closed";
          s.sessions.push(session);
          s.settings.activeSession = session.id;
          s.settings.userId = users[0];
        }, false)
      ) {
        closeModal();
        render();
        start(session.setId);
      }
    }
    if (form.id === "start-form") {
      const session = S.sessions.find((x) => x.id === form.dataset.session);
      const c = {
        setId: form.dataset.set,
        wineId: v("wineId"),
        userId: v("userId"),
        date: session?.date || v("date"),
        schema: session?.schema || v("schema"),
        blind: session ? session.blind : v("blind") === "true",
        sessionId: session?.id || null,
      };
      if (!Core.validDate(c.date) || c.date > Core.today())
        throw Error("Укажите дату не позднее сегодняшней");
      const year = getWine(c.wineId).year;
      if (year && Number(c.date.slice(0, 4)) < year)
        throw Error("Дата дегустации раньше года урожая");
      openRating(c);
    }
  } catch (error) {
    err(error.message);
  }
});
function rerenderKeepFocus(id) {
  const el = $("#" + id),
    pos = el?.selectionStart;
  render();
  const replacement = $("#" + id);
  replacement?.focus();
  if (pos != null && replacement?.setSelectionRange)
    try {
      replacement.setSelectionRange(pos, pos);
    } catch (e) {}
}
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    search = e.target.value;
    rerenderKeepFocus("search");
  }
  if (e.target.name === "comment" || e.target.name === "defect") {
    clearTimeout(App.draftTimer);
    App.draftTimer = setTimeout(saveDraft, 350);
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "sort") {
    sort = el.value;
    rerenderKeepFocus(el.id);
  }
  if (el.id === "history-user") {
    historyUser = el.value;
    rerenderKeepFocus(el.id);
  }
  if (el.id === "result-session") {
    resultsSession = el.value || null;
    resultsUser = "";
    rerenderKeepFocus(el.id);
  }
  if (el.id === "result-user") {
    resultsUser = el.value;
    rerenderKeepFocus(el.id);
  }
  if (el.id === "compare-name") {
    compareName = el.value;
    rerenderKeepFocus(el.id);
  }
  if (el.id === "compare-user") {
    compareUser = el.value;
    rerenderKeepFocus(el.id);
  }
  if (el.id === "compare-from") {
    compareFrom = el.value;
    rerenderKeepFocus(el.id);
  }
  if (el.id === "compare-to") {
    compareTo = el.value;
    rerenderKeepFocus(el.id);
  }
  if (el.name === "comment" || el.name === "defect") saveDraft();
});
const App = (window.App = {
  back,
  remote(key) {
    if (key === "BACK") return back();
    const scope = $(".modal") || document;
    const elements = [
      ...scope.querySelectorAll(
        'button,input:not([type=hidden]),select,textarea,[tabindex="0"]',
      ),
    ].filter((el) => !el.disabled && el.getClientRects().length);
    const el = document.activeElement;
    if (key === "CENTER") {
      if (elements.includes(el)) {
        if (el.matches("input:not([type=checkbox]),textarea")) {
          el.focus();
          if (native) Android.showKeyboard();
        } else el.click();
      } else elements[0]?.focus();
      return true;
    }
    if (!elements.includes(el)) {
      elements[0]?.focus();
      return true;
    }
    const r = el.getBoundingClientRect(),
      x = r.x + r.width / 2,
      y = r.y + r.height / 2;
    let best = null,
      score = Infinity;
    for (const b of elements) {
      if (b === el) continue;
      const br = b.getBoundingClientRect(),
        dx = br.x + br.width / 2 - x,
        dy = br.y + br.height / 2 - y;
      const main =
          key === "DOWN" ? dy : key === "UP" ? -dy : key === "RIGHT" ? dx : -dx,
        side = key === "DOWN" || key === "UP" ? Math.abs(dx) : Math.abs(dy);
      if (main < 2) continue;
      const n = main + side * 3 + (side > main ? 1000 : 0);
      if (n < score) {
        score = n;
        best = b;
      }
    }
    if (best) {
      best.focus();
      best.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    return true;
  },
  nativeResult(kind, data) {
    if (kind === "error") {
      notify(data);
      return;
    }
    if (kind === "saved") {
      notify("Файл сохранён: " + data);
      return;
    }
    try {
      if (kind === "photo") {
        if (App.photoTarget?.form) {
          photo = data;
          if ($("#photo-state"))
            $("#photo-state").textContent = "Фото добавлено";
        } else if (App.photoTarget?.wineId) {
          const id = App.photoTarget.wineId;
          commit((s) => {
            s.wines.find((x) => x.id === id).photo = data;
          });
        }
        return;
      }
      if (kind === "csv") {
        const setId = App.pendingImport?.setId;
        if (!setId) throw Error("Снова откройте импорт в нужном сете");
        const rows = Core.importPlan(data, getSet(setId));
        importRows = { setId, rows };
        modalBox(
          "Предпросмотр импорта",
          `<p>Найдено вин: <b>${rows.length}</b>. В сет будут добавлены все строки одним действием.</p><div class="import-preview">${rows
            .slice(0, 30)
            .map(
              (r) =>
                `<div><span>№ ${esc(r.number)}</span><b>${esc(r.wine.name)}</b><small>${r.wine.year || ""}</small></div>`,
            )
            .join(
              "",
            )}</div>${rows.length > 30 ? "<p>И ещё " + (rows.length - 30) + " вин.</p>" : ""}<div class="actions">${btn("Отмена", "close")}${btn("Добавить " + rows.length + " вин", "apply-import", "primary")}</div>`,
          true,
        );
      }
      if (kind === "restore") {
        const next = Core.validateState(JSON.parse(data));
        confirmBox(
          "Восстановить дневник?",
          `В копии: ${next.sets.length} сетов, ${next.wines.length} вин, ${next.ratings.length} оценок. Текущие данные будут заменены. Сначала сохраните их резервную копию, если они нужны.`,
          () => {
            const str = JSON.stringify(next);
            if (native) {
              if (!Android.writeState(str))
                throw Error("Ошибка записи резервной копии");
            } else localStorage.setItem("degustation", str);
            S = next;
            loadError = "";
            ratingContext = null;
            draft = null;
            screen = { name: S.settings.mode ? "sets" : "mode" };
            stack = [];
            render();
            notify("Дневник восстановлен");
          },
        );
      }
    } catch (e) {
      notify(e.message);
    }
  },
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (back()) e.preventDefault();
    return;
  }
  if (e.key === "Tab" && modal) {
    const els = [
      ...$(".modal").querySelectorAll("button,input,select,textarea"),
    ].filter((x) => x.getClientRects().length);
    if (e.shiftKey && document.activeElement === els[0]) {
      els[els.length - 1].focus();
      e.preventDefault();
    }
    if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
      els[0].focus();
      e.preventDefault();
    }
  }
  if (
    document.body.classList.contains("tv") &&
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
    !e.target.matches("input,textarea,select")
  ) {
    e.preventDefault();
    App.remote(e.key.slice(5).toUpperCase());
  }
});
window.addEventListener("pagehide", () => {
  if (screen.name === "rating") saveDraft();
});
render();
