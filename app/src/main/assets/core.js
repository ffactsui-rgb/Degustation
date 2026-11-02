/* Domain model and CSV codec. Shared unchanged by Android and the test runner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const row = (id, group, title, values, hint) => ({
    id,
    group,
    title,
    values,
    hint,
  });
  const schemas = {
    "oiv2025-still": {
      name: "OIV 2025 · тихие",
      source: "https://www.oiv.int/node/4087",
      rows: [
        row(
          "clarity",
          "Внешний вид",
          "Прозрачность",
          [5, 3, 1],
          "Оцените отсутствие помутнения.",
        ),
        row(
          "colour",
          "Внешний вид",
          "Цвет и оттенки",
          [5, 4, 3, 2, 1],
          "Оцените цвет вина и его оттенки.",
        ),
        row(
          "nosePure",
          "Аромат",
          "Чистота",
          [10, 9, 8, 7, 6],
          "Максимум означает отсутствие посторонних запахов и дефектов.",
        ),
        row(
          "noseIntensity",
          "Аромат",
          "Интенсивность",
          [10, 9, 8, 7, 6],
          "Насколько выразительны приятные ароматы вина.",
        ),
        row(
          "noseComplexity",
          "Аромат",
          "Сложность",
          [10, 9, 8, 7, 6],
          "Разнообразие, тонкость и развитие ароматов.",
        ),
        row(
          "tastePure",
          "Вкус",
          "Чистота",
          [10, 9, 8, 7, 6],
          "Оцените отсутствие дефектов во вкусе.",
        ),
        row(
          "tasteIntensity",
          "Вкус",
          "Интенсивность",
          [10, 9, 8, 7, 6],
          "Выраженность приятных вкусовых ощущений.",
        ),
        row(
          "structure",
          "Вкус",
          "Структура и сложность",
          [10, 9, 8, 7, 6],
          "Оцените структуру и развитие вкуса.",
        ),
        row(
          "persistence",
          "Вкус",
          "Послевкусие",
          [10, 9, 8, 7, 6],
          "Длительность приятных ощущений после глотка.",
        ),
        row(
          "balance",
          "Общее впечатление",
          "Баланс и гармония",
          [10, 9, 8, 7, 6],
          "Согласованность аромата, вкуса, кислотности и структуры.",
        ),
        row(
          "appreciation",
          "Общее впечатление",
          "Общая оценка",
          [10, 9, 8, 7, 6],
          "Целостное впечатление о качестве и характере вина.",
        ),
      ],
    },
    "classic-still": {
      name: "Классический OIV · тихие",
      source: "https://www.oiv.int/node/3463",
      rows: [
        row(
          "clarity",
          "Внешний вид",
          "Прозрачность",
          [5, 4, 3, 2, 1],
          "От прозрачного к мутному.",
        ),
        row(
          "colour",
          "Внешний вид",
          "Цвет и внешний вид",
          [10, 8, 6, 4, 2],
          "Цвет, оттенки и общий внешний вид.",
        ),
        row(
          "nosePure",
          "Аромат",
          "Чистота",
          [6, 5, 4, 3, 2],
          "От отсутствия дефектов к выраженным дефектам.",
        ),
        row(
          "noseIntensity",
          "Аромат",
          "Интенсивность",
          [8, 7, 6, 4, 2],
          "Выраженность положительных ароматов.",
        ),
        row(
          "noseQuality",
          "Аромат",
          "Качество",
          [16, 14, 12, 10, 8],
          "Разнообразие и тонкость букета.",
        ),
        row(
          "tastePure",
          "Вкус",
          "Чистота",
          [6, 5, 4, 3, 2],
          "Отсутствие посторонних вкусов.",
        ),
        row(
          "tasteIntensity",
          "Вкус",
          "Интенсивность",
          [8, 7, 6, 4, 2],
          "Выраженность положительных вкусов.",
        ),
        row(
          "tasteQuality",
          "Вкус",
          "Качество",
          [22, 19, 16, 13, 10],
          "Богатство вкуса и качество структуры.",
        ),
        row(
          "persistence",
          "Вкус",
          "Послевкусие",
          [8, 7, 6, 5, 4],
          "Длительность приятного послевкусия.",
        ),
        row(
          "appreciation",
          "Общее впечатление",
          "Гармония",
          [11, 10, 9, 8, 7],
          "Общее впечатление о вине.",
        ),
      ],
    },
  };
  schemas["oiv2025-sparkling"] = {
    name: "OIV 2025 · игристые",
    source: schemas["oiv2025-still"].source,
    rows: [
      ...schemas["oiv2025-still"].rows.slice(0, 2),
      row(
        "visualBubbles",
        "Внешний вид",
        "Перляж",
        [5, 4, 3, 2, 1],
        "Тонкость и обилие пузырьков, устойчивость пены.",
      ),
      ...schemas["oiv2025-still"].rows.slice(2, 5),
      row(
        "tasteBubbles",
        "Вкус",
        "Игра пузырьков",
        [5, 4, 3, 2, 1],
        "Тонкость, равномерность и интеграция пузырьков во вкусе.",
      ),
      ...schemas["oiv2025-still"].rows.slice(5, 7),
      row(
        "complexityPersistence",
        "Вкус",
        "Сложность и послевкусие",
        [10, 9, 8, 7, 6],
        "Развитие вкуса и продолжительность послевкусия.",
      ),
      ...schemas["oiv2025-still"].rows.slice(9),
    ],
  };
  function fail(message) {
    throw new Error(message);
  }
  function id() {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "id-" +
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2, 12);
  }
  function today() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }
  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false;
    const d = new Date(s + "T12:00:00Z");
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }
  function fresh() {
    const uid = id();
    return {
      version: 1,
      users: [{ id: uid, name: "Дегустатор" }],
      sets: [],
      wines: [],
      ratings: [],
      sessions: [],
      drafts: {},
      settings: { mode: null, userId: uid, activeSession: null },
    };
  }
  function total(schema, scores, complete = true) {
    const rows = schemas[schema]?.rows;
    if (!rows) fail("Неизвестный дегустационный лист");
    let sum = 0;
    for (const r of rows) {
      const v = scores[r.id];
      if (v === undefined) {
        if (complete) fail("Заполните все критерии");
        continue;
      }
      if (!r.values.includes(v)) fail("Недопустимый балл: " + r.title);
      sum += v;
    }
    return sum;
  }
  function mean(values) {
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
  }
  function stats(ratings) {
    const a = ratings.map((r) => r.total);
    return {
      count: a.length,
      avg: mean(a),
      min: a.length ? Math.min(...a) : null,
      max: a.length ? Math.max(...a) : null,
    };
  }
  function normalize(s) {
    return String(s || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("ru");
  }
  function nextNumber(set) {
    let n = 1;
    while (set.entries.some((e) => normalize(e.number) === String(n))) n++;
    return String(n);
  }
  function validateWine(w) {
    if (typeof w.name !== "string" || !w.name.trim() || w.name.length > 200)
      fail("Укажите название вина (до 200 символов)");
    if (
      w.year !== null &&
      w.year !== "" &&
      w.year !== undefined &&
      (!Number.isInteger(Number(w.year)) ||
        Number(w.year) < 1800 ||
        Number(w.year) > new Date().getFullYear() + 1)
    )
      fail("Некорректный год урожая");
    if (w.bottled && !validDate(w.bottled)) fail("Некорректная дата розлива");
    if (
      w.price !== "" &&
      w.price !== null &&
      w.price !== undefined &&
      (!Number.isFinite(Number(w.price)) || Number(w.price) < 0)
    )
      fail("Цена должна быть положительным числом");
    for (const k of ["producer", "bottled", "shop", "type", "notes"])
      if (w[k] !== undefined && typeof w[k] !== "string")
        fail("Некорректное поле вина: " + k);
    if (w.photo !== undefined && typeof w.photo !== "string")
      fail("Некорректное фото");
    if (
      w.photo &&
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(w.photo)
    )
      fail("Некорректное фото");
  }
  function validateState(s) {
    if (!s || s.version !== 1) fail("Неизвестная версия резервной копии");
    const map = {};
    for (const key of ["users", "sets", "wines", "ratings", "sessions"]) {
      if (!Array.isArray(s[key]) || s[key].length > 100000)
        fail("Повреждён раздел " + key);
      map[key] = new Set();
      for (const v of s[key]) {
        if (
          !v ||
          typeof v.id !== "string" ||
          !v.id ||
          !/^[A-Za-z0-9_-]{1,120}$/.test(v.id) ||
          map[key].has(v.id)
        )
          fail("Повторяющийся идентификатор " + key);
        map[key].add(v.id);
      }
    }
    if (!s.users.length) fail("Необходим хотя бы один оценщик");
    for (const u of s.users)
      if (typeof u.name !== "string" || !u.name.trim() || u.name.length > 100)
        fail("Некорректное имя оценщика");
    for (const w of s.wines) validateWine(w);
    for (const set of s.sets) {
      if (
        typeof set.name !== "string" ||
        !set.name.trim() ||
        !Array.isArray(set.entries)
      )
        fail("Повреждён сет");
      const wines = new Set(),
        nums = new Set();
      for (const e of set.entries) {
        if (
          !map.wines.has(e.wineId) ||
          wines.has(e.wineId) ||
          typeof e.number !== "string" ||
          !e.number.trim() ||
          e.number.length > 40 ||
          nums.has(normalize(e.number))
        )
          fail("Некорректный или повторяющийся образец в сете");
        wines.add(e.wineId);
        nums.add(normalize(e.number));
      }
    }
    for (const session of s.sessions) {
      if (
        !Array.isArray(session.entries) ||
        session.entries.some((e) => !map.wines.has(e.wineId) || !e.number)
      )
        fail("Повреждён состав групповой дегустации");
      if (
        !map.sets.has(session.setId) ||
        !Array.isArray(session.userIds) ||
        session.userIds.length < 2 ||
        new Set(session.userIds).size !== session.userIds.length ||
        session.userIds.some((u) => !map.users.has(u)) ||
        !schemas[session.schema] ||
        !validDate(session.date) ||
        !["active", "closed"].includes(session.status)
      )
        fail("Повреждена групповая дегустация");
    }
    for (const r of s.ratings) {
      if (
        !map.wines.has(r.wineId) ||
        !map.users.has(r.userId) ||
        !map.sets.has(r.setId) ||
        !validDate(r.date) ||
        !r.scores ||
        total(r.schema, r.scores) !== r.total ||
        typeof r.comment !== "string" ||
        r.comment.length > 10000 ||
        typeof r.createdAt !== "string" ||
        typeof r.number !== "string" ||
        (r.defect !== undefined && typeof r.defect !== "string")
      )
        fail("Повреждена оценка");
      if (r.sessionId) {
        const session = s.sessions.find((x) => x.id === r.sessionId);
        if (
          !session ||
          session.setId !== r.setId ||
          !session.userIds.includes(r.userId) ||
          session.schema !== r.schema ||
          session.date !== r.date ||
          !session.entries.some(
            (e) => e.wineId === r.wineId && e.number === r.number,
          )
        )
          fail("Оценка не соответствует групповой дегустации");
      }
    }
    if (
      !s.settings ||
      !map.users.has(s.settings.userId) ||
      ![null, "solo", "group"].includes(s.settings.mode)
    )
      fail("Повреждены настройки");
    if (
      s.settings.activeSession &&
      !s.sessions.some(
        (x) => x.id === s.settings.activeSession && x.status === "active",
      )
    )
      fail("Не найдена активная дегустация");
    if (!s.drafts || typeof s.drafts !== "object" || Array.isArray(s.drafts))
      s.drafts = {};
    for (const [key, d] of Object.entries(s.drafts)) {
      const parts = key.split(":");
      if (
        parts.length !== 6 ||
        !map.sets.has(parts[1]) ||
        !map.wines.has(parts[2]) ||
        !map.users.has(parts[3]) ||
        !schemas[parts[4]] ||
        !["true", "false"].includes(parts[5]) ||
        (parts[0] !== "solo" && !map.sessions.has(parts[0])) ||
        !d ||
        !validDate(d.date) ||
        !d.scores ||
        typeof d.scores !== "object" ||
        Array.isArray(d.scores) ||
        typeof d.comment !== "string" ||
        d.comment.length > 10000 ||
        typeof d.defect !== "string"
      )
        fail("Повреждён черновик");
      if (
        Object.keys(d.scores).some(
          (k) => !schemas[parts[4]].rows.some((r) => r.id === k),
        )
      )
        fail("Неизвестный критерий черновика");
      total(parts[4], d.scores, false);
    }
    return s;
  }
  function leaderboard(s, setId, sessionId = null, userId = null) {
    const set = s.sets.find((x) => x.id === setId);
    if (!set) return [];
    const scope = s.ratings.filter(
      (r) => r.setId === setId && (!sessionId || r.sessionId === sessionId),
    );
    const all = scope.filter((r) => !userId || r.userId === userId);
    const entries = sessionId
      ? s.sessions.find((x) => x.id === sessionId)?.entries || set.entries
      : set.entries;
    const result = entries
      .map((e) => {
        const ratings = all.filter((r) => r.wineId === e.wineId);
        const users = [...new Set(ratings.map((r) => r.userId))];
        const avg = sessionId
          ? mean(
              users.map((u) =>
                mean(ratings.filter((r) => r.userId === u).map((r) => r.total)),
              ),
            )
          : stats(ratings).avg;
        const eliminated =
          !!sessionId &&
          new Set(
            scope
              .filter((r) => r.wineId === e.wineId && r.defect)
              .map((r) => r.userId),
          ).size >= 2;
        return {
          ...e,
          wine: s.wines.find((w) => w.id === e.wineId),
          ...stats(ratings),
          avg,
          users: users.length,
          eliminated,
        };
      })
      .sort(
        (a, b) =>
          a.eliminated - b.eliminated ||
          (b.avg ?? -1) - (a.avg ?? -1) ||
          a.number.localeCompare(b.number, "ru", { numeric: true }),
      );
    let rank = 0,
      last = null;
    result.forEach((r, i) => {
      if (r.avg !== null && !r.eliminated) {
        if (last !== r.avg) rank = i + 1;
        r.rank = rank;
        last = r.avg;
      } else r.rank = null;
    });
    return result;
  }
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, "");
    if (text.length > 20 * 1024 * 1024)
      fail("CSV слишком большой (максимум 20 МБ)");
    let quote = false,
      first = "";
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') quote = !quote;
      if ((c === "\n" || c === "\r") && !quote) break;
      first += c;
    }
    const counts = { ";": 0, ",": 0, "\t": 0 };
    quote = false;
    for (let i = 0; i < first.length; i++) {
      if (first[i] === '"') {
        if (quote && first[i + 1] === '"') {
          i++;
          continue;
        }
        quote = !quote;
      } else if (!quote && first[i] in counts) counts[first[i]]++;
    }
    const sep = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const rows = [];
    let line = [],
      cell = "",
      inside = false,
      closed = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inside) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inside = false;
            closed = true;
          }
        } else cell += c;
      } else if (c === '"') {
        if (cell.trim() || closed) fail("Ошибка кавычек в CSV");
        inside = true;
      } else if (c === sep) {
        line.push(cell);
        cell = "";
        closed = false;
      } else if (c === "\r" || c === "\n") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        line.push(cell);
        if (line.some((x) => x.trim())) rows.push(line);
        line = [];
        cell = "";
        closed = false;
      } else {
        if (closed && c.trim()) fail("Лишний текст после кавычек в CSV");
        if (!closed) cell += c;
      }
    }
    if (inside) fail("Незакрытые кавычки в CSV");
    line.push(cell);
    if (line.some((x) => x.trim())) rows.push(line);
    if (rows.length < 2)
      fail("CSV должен содержать заголовок и хотя бы одно вино");
    return rows;
  }
  const aliases = {
    number: ["number", "blind_number", "номер", "номер образца", "образец"],
    name: ["name", "wine", "название", "вино", "название вина"],
    producer: ["producer", "производитель"],
    year: ["year", "vintage", "год", "год урожая"],
    bottled: ["bottled", "bottling_date", "дата розлива"],
    shop: ["shop", "store", "магазин"],
    price: ["price", "цена"],
    type: ["type", "тип"],
    notes: ["notes", "заметки", "комментарий"],
  };
  function importPlan(text, set) {
    const rows = parseCSV(text);
    const heads = rows.shift().map(normalize);
    const fields = {};
    for (const [key, alts] of Object.entries(aliases)) {
      const idx = heads.findIndex((h) => alts.includes(h));
      if (idx >= 0) fields[key] = idx;
    }
    if (fields.name === undefined)
      fail("Не найдена колонка name или «Название»");
    if (rows.length > 5000) fail("За один раз можно загрузить до 5000 вин");
    const used = new Set(set.entries.map((e) => normalize(e.number)));
    let auto = 1;
    return rows.map((cells, i) => {
      const get = (k) => (cells[fields[k]] || "").trim();
      let num = get("number");
      if (!num) {
        while (used.has(String(auto))) auto++;
        num = String(auto++);
      }
      if (num.length > 40 || used.has(normalize(num)))
        fail(
          "Строка " +
            (i + 2) +
            ": повторяющийся или слишком длинный номер " +
            num,
        );
      used.add(normalize(num));
      const price = get("price").replace(",", ".");
      const year = get("year");
      const wine = {
        id: id(),
        name: get("name"),
        producer: get("producer"),
        year: year ? Number(year) : null,
        bottled: get("bottled"),
        shop: get("shop"),
        price: price ? Number(price) : null,
        type: get("type") || "Тихое",
        notes: get("notes"),
        photo: "",
        createdAt: new Date().toISOString(),
      };
      try {
        validateWine(wine);
      } catch (e) {
        fail("Строка " + (i + 2) + ": " + e.message);
      }
      return { wine, number: num };
    });
  }
  function csvCell(v) {
    let t = String(v ?? "");
    if (/^[\s]*[=+\-@]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  }
  function csv(rows) {
    return (
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n")
    );
  }
  const wineHeader = [
    "number",
    "name",
    "producer",
    "year",
    "bottled",
    "shop",
    "price",
    "type",
    "notes",
  ];
  function wineCSV(s, setId) {
    const set = s.sets.find((x) => x.id === setId);
    return csv([
      wineHeader,
      ...set.entries.map((e) => {
        const w = s.wines.find((x) => x.id === e.wineId);
        return [
          e.number,
          w.name,
          w.producer,
          w.year,
          w.bottled,
          w.shop,
          w.price,
          w.type,
          w.notes,
        ];
      }),
    ]);
  }
  function resultCSV(s, setId, sessionId) {
    const board = leaderboard(s, setId, sessionId);
    const summary = csv([
      [
        "set",
        "number",
        "name",
        "year",
        "rank",
        "average",
        "min",
        "max",
        "ratings",
        "tasters",
        "excluded",
      ],
      ...board.map((r) => [
        s.sets.find((x) => x.id === setId).name,
        r.number,
        r.wine.name,
        r.wine.year,
        r.rank,
        r.avg === null ? "" : r.avg.toFixed(2),
        r.min,
        r.max,
        r.count,
        r.users,
        r.eliminated ? "Да" : "",
      ]),
    ]);
    return summary;
  }
  function ratingsCSV(s, setId, sessionId) {
    const keys = [
      ...new Set(
        Object.values(schemas).flatMap((x) => x.rows.map((r) => r.id)),
      ),
    ];
    return csv([
      [
        "rating_id",
        "session_id",
        "set",
        "number",
        "wine",
        "producer",
        "year",
        "user",
        "date",
        "schema",
        "total",
        "defect",
        "comment",
        ...keys,
      ],
      ...s.ratings
        .filter(
          (r) =>
            (!setId || r.setId === setId) &&
            (!sessionId || r.sessionId === sessionId),
        )
        .map((r) => {
          const w = s.wines.find((w) => w.id === r.wineId);
          return [
            r.id,
            r.sessionId,
            s.sets.find((x) => x.id === r.setId).name,
            r.number,
            w.name,
            w.producer,
            w.year,
            s.users.find((x) => x.id === r.userId).name,
            r.date,
            r.schema,
            r.total,
            r.defect,
            r.comment,
            ...keys.map((k) => r.scores[k] ?? ""),
          ];
        }),
    ]);
  }
  function age(w, date) {
    if (!w.year || !validDate(date)) return null;
    return Number(date.slice(0, 4)) - Number(w.year);
  }
  return {
    schemas,
    id,
    today,
    validDate,
    fresh,
    total,
    mean,
    stats,
    normalize,
    nextNumber,
    validateWine,
    validateState,
    leaderboard,
    parseCSV,
    importPlan,
    csv,
    wineCSV,
    resultCSV,
    ratingsCSV,
    age,
  };
});
