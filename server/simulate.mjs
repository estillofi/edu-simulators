// Демо-класс: боты шлют события kori-trace на сервер, чтобы проверить табло без живых учеников.
// node server/simulate.mjs [--class DEMO-7A] [--n 25] [--minutes 4] [--speed 1] [--url http://localhost:8787]
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg("url", "http://localhost:8787");
const CLASS = arg("class", "DEMO-7A");
const N = Number(arg("n", 25));
const MINUTES = Number(arg("minutes", 4));
const SPEED = Number(arg("speed", 1));

const SKILLS = ["mult", "brackets", "like", "value"];
const TPL = { mult: ["k_br", "mono2", "br_k"], brackets: ["minus_sum", "minus_diff", "nest1"], like: ["sum_br", "diff_br", "k_minus_x"], value: ["val1", "val2"] };
// Профиль: p — вероятность верного ответа с первой попытки; misc — устойчивое заблуждение; rapid — быстрые угадывания; freeze — зависает
const PROFILES = [
  ...Array(6).fill({ kind: "сильный", p: 0.92, think: [8, 20] }),
  ...Array(9).fill({ kind: "средний", p: 0.7, think: [12, 35] }),
  ...Array(4).fill({ kind: "минус перед скобкой", p: 0.55, misc: "minus_only_first", think: [12, 30] }),
  ...Array(2).fill({ kind: "x без коэффициента", p: 0.6, misc: "coef_one_lost", think: [12, 30] }),
  ...Array(2).fill({ kind: "угадывает", p: 0.3, rapid: true, think: [2, 4] }),
  ...Array(2).fill({ kind: "зависает", p: 0.4, freeze: true, think: [40, 160] }),
];
const rnd = (a, b) => a + Math.random() * (b - a);
const uid = () => crypto.randomUUID();
const tok = () => Math.random().toString(36).slice(2, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
const queue = [];
async function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try { await fetch(`${URL_}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch) }); } catch (e) { console.error("сервер недоступен:", e.message); }
}
setInterval(flush, 1000);

async function student(i) {
  const prof = PROFILES[i % PROFILES.length];
  const s = { student_ref: `bot-${tok()}`, session_id: uid(), class_ref: CLASS, trainer: "math7-expressions", trainer_version: "sim" };
  const emit = (type, d = {}) => queue.push({ v: 1, event_id: uid(), ts: Date.now(), type, ...s, ...d });
  await sleep(rnd(0, 20000));
  emit("session_start", { sim_profile: prof.kind });
  const end = Date.now() + (MINUTES * 60000) / SPEED;
  let level = 1, upRun = 0;
  const hb = setInterval(() => emit("heartbeat", { idle_ms: Math.round(rnd(0, 20000)) }), 15000 / SPEED);
  while (Date.now() < end) {
    const skill = prof.misc === "minus_only_first" ? (Math.random() < 0.6 ? "brackets" : "like") : SKILLS[Math.floor(Math.random() * SKILLS.length)];
    const tpl = TPL[skill][Math.floor(Math.random() * TPL[skill].length)];
    const base = { item_id: `${skill}.${tpl}:sim${Math.floor(Math.random() * 1e4)}`, skill, node: "math_transform_keeps_value", level, template: `${skill}.${tpl}` };
    emit("item_start", base);
    const t0 = Date.now();
    let solved = false, attempts = 0, hints = 0;
    if (prof.rapid && Math.random() < 0.5) { await sleep(rnd(1500, 4000)); hints++; emit("hint", { ...base, hint_level: 1, latency_ms: Date.now() - t0 }); }
    for (let a = 1; a <= 2 && !solved; a++) {
      await sleep(rnd(...prof.think) * 1000 * (prof.freeze && a === 1 && Math.random() < 0.5 ? 1.6 : 1));
      if (Date.now() > end + 5000) break;
      attempts++;
      const p = a === 1 ? prof.p : prof.p * 0.8;
      const ok = Math.random() < p;
      const misconception = ok ? null : prof.misc && Math.random() < 0.8 ? prof.misc : Math.random() < 0.3 ? "unlike_combined" : null;
      emit("attempt", { ...base, attempt_no: a, correct: ok, answer: ok ? "верно" : "ошибка", misconception, latency_ms: prof.rapid ? Math.round(rnd(1500, 4500)) : Math.round(rnd(...prof.think) * 1000), hints_so_far: hints });
      if (ok) solved = true;
      else if (!prof.rapid && Math.random() < 0.4) { hints++; emit("hint", { ...base, hint_level: hints, latency_ms: Date.now() - t0 }); }
    }
    const sc = solved ? Math.max(0, 1 - 0.25 * (attempts - 1) - 0.25 * hints) : 0;
    emit("item_end", { ...base, solved, attempts, hints, superscore: sc, duration_ms: Date.now() - t0 });
    if (sc === 1) { upRun++; if (upRun >= 2 && level < 3) { level++; upRun = 0; } } else { upRun = 0; if (!solved && level > 1) level--; }
    await sleep(rnd(1000, 3000));
  }
  clearInterval(hb);
  emit("session_end");
}
console.log(`Демо-класс ${CLASS}: ${N} ботов, ${MINUTES} мин, скорость ×${SPEED} → ${URL_}`);
await Promise.all(Array.from({ length: N }, (_, i) => student(i)));
await flush();
console.log("Готово.");
process.exit(0);
