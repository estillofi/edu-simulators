// Самопроверка банка: каждое задание принимает свой верный ответ и узнаёт каждую ловушку своим ID.
// Запуск: node math-7/mental-rational/selftest.mjs [N на шаблон]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const src = readFileSync(fileURLToPath(new URL("./bank.js", import.meta.url)), "utf8");
new Function(src)();
const { T, makeTask, check, ansStr, CODES, MSG } = globalThis.MentalBank;
const N = Number(process.argv[2] || 400);
let total = 0, fails = 0, trapsChecked = 0; const rows = [];
for (const skill of Object.keys(T)) for (const lv of [1, 2, 3]) for (const tpl of T[skill][lv]) {
  const ids = new Set(); let withTrap = 0;
  for (let i = 0; i < N; i++) {
    let t; try { t = makeTask(skill, lv, tpl.id); } catch (e) { fails++; console.log("GEN", tpl.id, e.message); continue; }
    total++; ids.add(t.item_id);
    if (t.kind === "num" && (!t.ans || !Number.isFinite(t.ans.v))) { fails++; console.log("ANS", t.item_id); continue; }
    const r = check(t, ansStr(t, t.ans));
    if (r.state !== "ok") { fails++; if (fails < 30) console.log("OK?", t.item_id, ansStr(t, t.ans), r); }
    if (t.traps.length) withTrap++;
    for (const tr of t.traps) {
      trapsChecked++;
      if (!CODES[tr.code] || !MSG[tr.code]) { fails++; console.log("CODE", tr.code); }
      const rr = check(t, ansStr(t, tr.val));
      if (rr.code !== tr.code) { fails++; if (fails < 30) console.log("TRAP", t.item_id, tr.code, ansStr(t, tr.val), rr); }
    }
    if (/NaN|undefined|null|Infinity/.test(t.expr + t.hint3)) { fails++; console.log("TXT", t.item_id, t.hint3); }
  }
  rows.push(`${skill}.${tpl.id} (${"АБВ"[lv - 1]}): уникальных ${ids.size} из ${N}, с ловушкой ${Math.round(100 * withTrap / N)}%`);
}
console.log(rows.join("\n"));
console.log(`\nЗаданий: ${total}, ловушек проверено: ${trapsChecked}, отказов: ${fails}`);
process.exit(fails ? 1 : 0);
