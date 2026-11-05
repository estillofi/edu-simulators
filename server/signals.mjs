// Три сигнала учителя и педагогические измерения из событий kori-trace.
// Чистые функции без базы: разработка может перенести их в LMS как есть.
// Пороги — гипотезы прототипа, вынесены в RULES и калибруются на пилоте.

export const RULES = {
  onlineMs: 45_000,          // нет событий дольше — ученик не на странице
  stuckWrongInRow: 3,        // три неверные попытки подряд в одном навыке
  stuckSameMisconception: 2, // одна и та же ошибка дважды в последних пяти попытках
  stuckOpenMs: 120_000,      // над одним заданием дольше двух минут…
  stuckQuietMs: 90_000,      // …и последние полторы минуты без попыток
  rapidMs: 5_000,            // неверный ответ быстрее 5 с — похоже на угадывание
  rapidCount: 2,             // сколько таких в последних четырёх попытках
  hintRushMs: 6_000,         // подсказка раньше 6 с после показа задания
  masteryP: 0.95,            // вероятность освоения навыка (BKT)
  masteryRun: 3,             // или три задания подряд с супербаллом 1 на уровне Б/В
  masteryMinItems: 4,        // и не меньше четырёх заданий в навыке — иначе это удача, а не освоение
};
// Bayesian Knowledge Tracing (Corbett & Anderson, 1995): стартовые параметры, не калиброваны.
export const BKT = { p0: 0.2, learn: 0.15, guess: 0.2, slip: 0.1 };

export function bktUpdate(p, correct) {
  const { learn, guess, slip } = BKT;
  const post = correct ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess) : (p * slip) / (p * slip + (1 - p) * (1 - guess));
  return post + (1 - post) * learn;
}

const SKILL_RU = { like: "подобные слагаемые", brackets: "раскрытие скобок", mult: "законы умножения", value: "значение выражения" };
const skillName = (s) => SKILL_RU[s] || s || "навык";

export function classState(rows, now = Date.now()) {
  const by = new Map();
  for (const e of rows) {
    if (!by.has(e.student_ref)) by.set(e.student_ref, []);
    by.get(e.student_ref).push(e);
  }
  const students = [];
  const misc = new Map();
  const skillAgg = new Map();
  for (const [ref, evs] of by) {
    const last = evs[evs.length - 1];
    const online = now - last.ts < RULES.onlineMs && last.type !== "session_end";
    const attempts = evs.filter((e) => e.type === "attempt");
    const ends = evs.filter((e) => e.type === "item_end");
    const starts = evs.filter((e) => e.type === "item_start");
    const hints = evs.filter((e) => e.type === "hint");
    const hb = [...evs].reverse().find((e) => e.type === "heartbeat");
    // открытое задание
    const lastStart = starts[starts.length - 1];
    const open = lastStart && !ends.some((e) => e.item_id === lastStart.item_id && e.ts >= lastStart.ts) ? lastStart : null;
    const lastAttempt = attempts[attempts.length - 1];
    // BKT по первым попыткам каждого задания
    const mastery = {};
    const firsts = attempts.filter((a) => a.attempt_no === 1);
    for (const a of firsts) {
      const k = a.skill || "—";
      mastery[k] = bktUpdate(mastery[k] ?? BKT.p0, !!a.correct);
    }
    // ── Сигнал «застрял» ──
    const stuck = [];
    const tail3 = attempts.slice(-RULES.stuckWrongInRow);
    if (tail3.length === RULES.stuckWrongInRow && tail3.every((a) => !a.correct) && new Set(tail3.map((a) => a.skill)).size === 1)
      stuck.push(`${RULES.stuckWrongInRow} ошибки подряд: ${skillName(tail3[0].skill)}`);
    const tail5 = attempts.slice(-5);
    const codes = {};
    tail5.forEach((a) => a.misconception && (codes[a.misconception] = (codes[a.misconception] || 0) + 1));
    const rep = Object.entries(codes).find(([, c]) => c >= RULES.stuckSameMisconception);
    if (rep && lastAttempt && !lastAttempt.correct) stuck.push(`одна и та же ошибка: ${rep[0]}`);
    if (open && online && now - open.ts > RULES.stuckOpenMs && (!lastAttempt || now - lastAttempt.ts > RULES.stuckQuietMs))
      stuck.push(`${Math.round((now - open.ts) / 60000)} мин над одним заданием`);
    // ── Сигнал «угадывает» ──
    const guessing = [];
    const tail4 = attempts.slice(-4);
    const rapid = tail4.filter((a) => !a.correct && a.latency_ms !== null && a.latency_ms < RULES.rapidMs).length;
    if (rapid >= RULES.rapidCount) guessing.push(`быстрые неверные ответы: ${rapid} из ${tail4.length}`);
    const rushed = hints.slice(-4).filter((h) => h.latency_ms !== null && h.latency_ms < RULES.hintRushMs).length;
    if (rushed >= 2) guessing.push(`подсказка сразу, не пробуя: ${rushed} раза`);
    // ── Сигнал «освоил» ──
    const mastered = [];
    const skills = [...new Set(ends.map((e) => e.skill))];
    for (const s of skills) {
      const se = ends.filter((e) => e.skill === s);
      const run = se.slice(-RULES.masteryRun);
      const byRun = run.length === RULES.masteryRun && run.every((e) => e.superscore === 1 && (e.level ?? 1) >= 2);
      const nFirst = firsts.filter((a) => a.skill === s).length;
      if (se.length >= RULES.masteryMinItems && nFirst >= RULES.masteryMinItems && ((mastery[s] ?? 0) >= RULES.masteryP || byRun) && !guessing.length) mastered.push(s);
    }
    // ── Метрики ──
    const perf = ends.length ? ends.reduce((s, e) => s + (e.superscore ?? 0), 0) / ends.length : null;
    let streak = 0;
    for (let i = ends.length - 1; i >= 0 && ends[i].superscore === 1; i--) streak++;
    const cur = open || lastStart || last;
    students.push({
      ref, online, last_ts: last.ts, trainer: cur.trainer, skill: cur.skill, level: cur.level,
      open_ms: open ? now - open.ts : null, idle_ms: hb ? hb.idle_ms : null,
      done: ends.length, perf, streak,
      recent: ends.slice(-10).map((e) => (e.superscore === 1 ? "ok" : e.solved ? "help" : "miss")),
      signals: { stuck: stuck.length ? stuck : null, guessing: guessing.length ? guessing : null, mastered },
      mastery,
      attempts: attempts.slice(-8).reverse().map((a) => ({ ts: a.ts, item: a.item_id, skill: a.skill, level: a.level, answer: a.answer, correct: !!a.correct, code: a.misconception, latency: a.latency_ms })),
    });
    attempts.forEach((a) => { if (a.misconception) { const m = misc.get(a.misconception) || { code: a.misconception, students: new Set(), attempts: 0 }; m.students.add(ref); m.attempts++; misc.set(a.misconception, m); } });
    ends.forEach((e) => { const k = e.skill || "—"; const s = skillAgg.get(k) || { skill: k, sum: 0, n: 0, students: new Set() }; s.sum += e.superscore ?? 0; s.n++; s.students.add(ref); skillAgg.set(k, s); });
  }
  const pri = (s) => (s.signals.stuck ? 0 : s.signals.guessing ? 1 : s.online ? 2 : 3);
  students.sort((a, b) => pri(a) - pri(b) || (b.last_ts - a.last_ts));
  return {
    now, rules: RULES,
    summary: {
      total: students.length, online: students.filter((s) => s.online).length,
      stuck: students.filter((s) => s.signals.stuck).length,
      guessing: students.filter((s) => s.signals.guessing).length,
      mastered: students.filter((s) => s.signals.mastered.length).length,
    },
    students,
    misconceptions: [...misc.values()].map((m) => ({ code: m.code, students: m.students.size, attempts: m.attempts })).sort((a, b) => b.students - a.students),
    skills: [...skillAgg.values()].map((s) => ({ skill: s.skill, perf: s.sum / s.n, items: s.n, students: s.students.size })),
  };
}

// Педагогические измерения (по Д. Аббакумову, «Психометрика в EdTech»): супербалл → успеваемость, посильность, дельта.
// Формулы — реализация прототипа; с текстом книги не сверены, см. docs/psychometrics.md.
export function analytics(ends) {
  const tpl = new Map();
  for (const e of ends) {
    const k = e.template || e.item_id;
    const t = tpl.get(k) || { template: k, trainer: e.trainer, skill: e.skill, level: e.level, sum: 0, n: 0, students: new Set() };
    t.sum += e.superscore ?? 0; t.n++; t.students.add(e.student_ref); tpl.set(k, t);
  }
  const feas = (k) => { const t = tpl.get(k); return t ? t.sum / t.n : null; };
  const st = new Map();
  for (const e of ends) {
    const s = st.get(e.student_ref) || { ref: e.student_ref, class_ref: e.class_ref, sum: 0, n: 0, dsum: 0 };
    s.sum += e.superscore ?? 0; s.n++; s.dsum += (e.superscore ?? 0) - (feas(e.template || e.item_id) ?? 0);
    st.set(e.student_ref, s);
  }
  const segment = (perf, delta) => (perf >= 0.85 ? "сильный" : perf >= 0.6 ? (delta >= 0 ? "уверенный" : "держится") : delta >= -0.05 ? "растёт" : "нужна помощь");
  return {
    note: "Супербалл: 1 — с первой попытки без подсказок; −0,25 за каждую лишнюю попытку и подсказку; 0 — не решено. Успеваемость ученика и посильность задания — средний супербалл. Дельта — насколько ученик выше или ниже посильности тех же заданий. Ориентир посильности ≈ 0,85 — гипотеза.",
    students: [...st.values()].map((s) => { const perf = s.sum / s.n, delta = s.dsum / s.n; return { ref: s.ref, class_ref: s.class_ref, items: s.n, performance: perf, delta, segment: segment(perf, delta) }; }).sort((a, b) => b.performance - a.performance),
    templates: [...tpl.values()].map((t) => {
      const f = t.sum / t.n;
      return { template: t.template, trainer: t.trainer, skill: t.skill, level: t.level, items: t.n, students: t.students.size, feasibility: f, flag: t.students.size < 3 ? "мало данных" : f < 0.3 ? "слишком трудно" : f > 0.95 ? "слишком легко" : null };
    }).sort((a, b) => a.feasibility - b.feasibility),
  };
}
