const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../app/src/main/assets/core.js");
function fixture() {
  const s = C.fresh();
  s.settings.mode = "solo";
  s.users.push({ id: "second", name: "Второй" });
  s.wines = [
    { id: "w1", name: "Рислинг", producer: "Дом", year: 2020 },
    { id: "w2", name: "Рислинг", producer: "Дом", year: 2022 },
  ];
  s.sets = [
    {
      id: "set",
      name: "Сет",
      date: "2026-11-02",
      entries: [
        { wineId: "w1", number: "1" },
        { wineId: "w2", number: "2" },
      ],
    },
  ];
  return s;
}
function rate(
  s,
  userId,
  wineId = "w1",
  level = 0,
  sessionId = null,
  defect = "",
) {
  const scores = {};
  for (const row of C.schemas["oiv2025-still"].rows)
    scores[row.id] = row.values[level];
  const r = {
    id: C.id(),
    setId: "set",
    wineId,
    userId,
    date: "2026-11-02",
    number: wineId === "w1" ? "1" : "2",
    schema: "oiv2025-still",
    scores,
    total: C.total("oiv2025-still", scores),
    comment: "Тест",
    defect,
    sessionId,
    createdAt: new Date().toISOString(),
  };
  s.ratings.push(r);
  return r;
}
function session(s) {
  s.sessions.push({
    id: "session",
    setId: "set",
    userIds: s.users.map((u) => u.id),
    date: "2026-11-02",
    schema: "oiv2025-still",
    blind: true,
    status: "active",
    entries: JSON.parse(JSON.stringify(s.sets[0].entries)),
  });
  s.settings.activeSession = "session";
  return s;
}
for (const [name, schema] of Object.entries(C.schemas))
  test(name + " has exactly 100 points and requires every row", () => {
    const scores = {};
    for (const r of schema.rows) scores[r.id] = r.values[0];
    assert.equal(C.total(name, scores), 100);
    delete scores[schema.rows[0].id];
    assert.throws(() => C.total(name, scores));
    assert.ok(C.total(name, scores, false) < 100);
    scores[schema.rows[0].id] = 123;
    assert.throws(() => C.total(name, scores));
  });
test("repeated ratings remain distinct and retain min/max", () => {
  const s = fixture();
  rate(s, s.users[0].id);
  rate(s, s.users[0].id, "w1", 1);
  C.validateState(s);
  const st = C.stats(s.ratings);
  assert.deepEqual(st, { count: 2, avg: 94, min: 88, max: 100 });
});
test("panel gives equal weight to people despite repeated ratings", () => {
  const s = session(fixture()),
    u = s.users[0].id;
  rate(s, u, "w1", 0, "session");
  rate(s, u, "w1", 0, "session");
  rate(s, u, "w1", 2, "session");
  rate(s, "second", "w1", 2, "session");
  const b = C.leaderboard(s, "set", "session");
  assert.equal(b[0].avg, 84);
  assert.equal(b[0].count, 4);
  assert.equal(b[0].users, 2);
  C.validateState(s);
});
test("session snapshots do not acquire later additions to a set", () => {
  const s = session(fixture());
  s.wines.push({ id: "w3", name: "Новое" });
  s.sets[0].entries.push({ wineId: "w3", number: "3" });
  assert.equal(C.leaderboard(s, "set", "session").length, 2);
  assert.equal(C.leaderboard(s, "set").length, 3);
});
test("ties get equal competition rank, next rank skips a place", () => {
  const s = fixture();
  rate(s, s.users[0].id);
  rate(s, s.users[0].id, "w2");
  const b = C.leaderboard(s, "set");
  assert.deepEqual(
    b.map((r) => r.rank),
    [1, 1],
  );
});
test("unrated wines have no average or award rank", () => {
  const s = fixture();
  assert.equal(C.leaderboard(s, "set")[0].avg, null);
  assert.equal(C.leaderboard(s, "set")[0].rank, null);
});
test("two defects by the same juror do not exclude the wine", () => {
  const s = session(fixture());
  rate(s, s.users[0].id, "w1", 0, "session", "Пробка");
  rate(s, s.users[0].id, "w1", 0, "session", "Пробка");
  assert.equal(C.leaderboard(s, "set", "session")[0].eliminated, false);
  rate(s, "second", "w1", 0, "session", "Пробка");
  assert.equal(
    C.leaderboard(s, "set", "session").find((x) => x.wineId === "w1").rank,
    null,
  );
});
test("CSV handles BOM, semicolons, embedded quotes and multiline notes", () => {
  const plan = C.importPlan(
    '\uFEFFnumber;name;year;notes\r\n5;"Рислинг; Резерв";2020;"Цитрус\nи ""минералы"""',
    fixture().sets[0],
  );
  assert.equal(plan[0].wine.name, "Рислинг; Резерв");
  assert.equal(plan[0].wine.notes, 'Цитрус\nи "минералы"');
});
test("CSV detects comma and tab delimiters outside quotes", () => {
  assert.equal(
    C.parseCSV('name,producer\n"Wine, one",House')[1][0],
    "Wine, one",
  );
  assert.equal(C.parseCSV("name\tyear\nWine\t2020")[1][1], "2020");
});
test("CSV accepts Russian columns and decimal comma", () => {
  const p = C.importPlan(
    "Номер;Название;Год;Цена\n8;Вино;2020;1200,50",
    fixture().sets[0],
  );
  assert.equal(p[0].wine.price, 1200.5);
  assert.equal(p[0].wine.year, 2020);
});
test("CSV auto numbering skips already used numbers", () => {
  const p = C.importPlan("name\nПервое\nВторое", fixture().sets[0]);
  assert.deepEqual(
    p.map((x) => x.number),
    ["3", "4"],
  );
});
test("CSV rejects duplicate sample numbers without partial changes", () => {
  const set = fixture().sets[0];
  assert.throws(() => C.importPlan("number;name\n5;Первое\n5;Второе", set));
  assert.throws(() => C.importPlan("number;name\n1;Первое", set));
  assert.equal(set.entries.length, 2);
});
test("CSV rejects malformed quotes, missing name and invalid vintage", () => {
  assert.throws(() => C.parseCSV('name;notes\n"Вино;незакрыто'));
  assert.throws(() => C.importPlan("producer\nДом", fixture().sets[0]));
  assert.throws(() => C.importPlan("name;year\nВино;abc", fixture().sets[0]));
});
test("export quotes cells and neutralizes spreadsheet formula prefixes", () => {
  const out = C.csv([
    ['=HYPERLINK("bad")', "+cmd", "@bad", "normal;quoted", "line\nbreak"],
  ]);
  assert.ok(out.startsWith("\uFEFF"));
  assert.ok(out.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(out.includes('"\'+cmd"'));
  assert.ok(out.includes('"normal;quoted"'));
});
test("wine CSV export can be reimported into another set", () => {
  const s = fixture();
  const text = C.wineCSV(s, "set"),
    plan = C.importPlan(text, { entries: [] });
  assert.equal(plan.length, 2);
  assert.equal(plan[1].wine.year, 2022);
});
test("backup validation rejects inconsistent totals, users and session schemes", () => {
  let s = session(fixture());
  rate(s, s.users[0].id, "w1", 0, "session");
  assert.equal(C.validateState(s), s);
  s.ratings[0].total = 99;
  assert.throws(() => C.validateState(s));
  s.ratings[0].total = 100;
  s.ratings[0].userId = "missing";
  assert.throws(() => C.validateState(s));
  s.ratings[0].userId = s.users[0].id;
  s.ratings[0].number = "20";
  assert.throws(() => C.validateState(s));
});
test("backup validation rejects duplicate membership and unknown version", () => {
  const s = fixture();
  s.sets[0].entries.push({ ...s.sets[0].entries[0] });
  assert.throws(() => C.validateState(s));
  assert.throws(() => C.validateState({ version: 4 }));
});
test("backup JSON round trip preserves all scores, sessions and photo data", () => {
  const s = session(fixture());
  s.wines[0].photo = "data:image/jpeg;base64,YWJj";
  rate(s, s.users[0].id, "w1", 0, "session");
  const copy = C.validateState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(copy, s);
});
test("dates validate leap years and age is based on tasting year", () => {
  assert.equal(C.validDate("2024-02-29"), true);
  assert.equal(C.validDate("2025-02-29"), false);
  assert.equal(C.validDate("2026-13-01"), false);
  assert.equal(C.age({ year: 2020 }, "2026-01-01"), 6);
  assert.equal(C.age({}, "2026-01-01"), null);
});
test("results and detailed CSV can be scoped to a specific session", () => {
  const s = session(fixture());
  rate(s, s.users[0].id, "w1", 0, "session");
  rate(s, "second", "w1", 1, null);
  const rows = C.parseCSV(C.ratingsCSV(s, "set", "session"));
  assert.equal(rows.length, 2);
  assert.equal(rows[1][10], "100");
  assert.ok(C.resultCSV(s, "set", "session").includes("100.00"));
});
test("backup rejects markup in ids and malformed drafts", () => {
  const s = fixture();
  s.wines[0].id = 'bad" onclick="';
  assert.throws(() => C.validateState(s));
  const next = fixture();
  const key = [
    "solo",
    "set",
    "w1",
    next.users[0].id,
    "oiv2025-still",
    "true",
  ].join(":");
  next.drafts[key] = {
    date: "2026-11-02",
    scores: { clarity: 5 },
    comment: "",
    defect: "",
  };
  C.validateState(next);
  next.drafts[key].scores = { unexpected: 100 };
  assert.throws(() => C.validateState(next));
});
test("a juror filter does not undo disqualification by two different participants", () => {
  const s = session(fixture());
  rate(s, s.users[0].id, "w1", 0, "session", "Дефект");
  rate(s, "second", "w1", 0, "session", "Дефект");
  const row = C.leaderboard(s, "set", "session", s.users[0].id).find(
    (r) => r.wineId === "w1",
  );
  assert.equal(row.eliminated, true);
  assert.equal(row.rank, null);
});
