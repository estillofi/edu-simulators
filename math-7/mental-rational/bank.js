// Банк шаблонов «Устный счёт: дроби и отрицательные числа» (7 класс).
// Каждый шаблон — функция со случайными параметрами: задание не повторяется дословно, заучить ответ нельзя.
// Числа хранятся точно — обыкновенной дробью (класс F), десятичные — тоже F со знаменателем 10ⁿ.
(function (root) {
"use strict";
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const lcm = (a, b) => (a / gcd(a, b)) * b;

class F {
  constructor(n, d = 1) { if (!d) throw new Error("d=0"); if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g; }
  add(o) { return new F(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return this.add(o.neg()); }
  mul(o) { return new F(this.n * o.n, this.d * o.d); }
  div(o) { return new F(this.n * o.d, this.d * o.n); }
  neg() { return new F(-this.n, this.d); }
  eq(o) { return this.n === o.n && this.d === o.d; }
  cmp(o) { return Math.sign(this.n * o.d - o.n * this.d); }
  get v() { return this.n / this.d; }
}
const f = (n, d = 1) => new F(n, d);
const dec = (int, places) => f(int, 10 ** places);
const fromStr = (s) => { const [i, p = ""] = s.replace("-", "").split("."); const x = f(Number(i + p), 10 ** p.length); return s.startsWith("-") ? x.neg() : x; };

// ── Запись для показа: [n/d] — дробь, 2[1/3] — смешанное, * — умножение, : — деление, □ — окошко, ? — знак сравнения ──
function decStr(x) {
  let k = 0; while (k < 9 && (x.n * 10 ** k) % x.d !== 0) k++;
  if (k === 9) return null;
  let s = String(Math.abs((x.n * 10 ** k) / x.d));
  if (k) { s = s.padStart(k + 1, "0"); s = `${s.slice(0, -k)}.${s.slice(-k)}`; }
  return (x.n < 0 ? "-" : "") + s;
}
const fr = (n, d) => (n < 0 ? `-[${-n}/${d}]` : `[${n}/${d}]`);
const frF = (x) => (x.d === 1 ? String(x.n) : fr(x.n, x.d));
const P = (s) => (String(s).startsWith("-") ? `(${s})` : String(s)); // отрицательное после знака действия — в скобках
const D = (x) => decStr(x);
const coprime = (d) => { let n; do n = ri(1, d - 1); while (gcd(n, d) !== 1); return n; };
const nonRound = (lo, hi) => { let v; do v = ri(lo, hi); while (v % 10 === 0); return v; };

// ── Заблуждения. Канон — таблица методиста «Алгебра 7 — онлайн-школа», ред. 4 (лист «Типичные ошибки»); остальное local ──
const CODES = {
  sign_rule_over_addition: "«Минус на минус даёт плюс» переносит на сложение: −3 + (−4) = 7",
  minus_is_operation_only: "Минус — всегда «отнять»: в 5 + (−3) теряет знак числа, пишет 8",
  subtraction_always_decreases: "Вычитание всегда уменьшает: −3 − (−8) считает меньше −3",
  longer_record_is_bigger: "Больше та десятичная дробь, у которой больше цифр: 0,25 > 0,5",
  negative_fractions_as_positive: "Сравнивает отрицательные как положительные: −1/3 < −1/2",
  bigger_denominator: "Чем больше знаменатель, тем больше дробь: 1/8 > 1/3",
  add_num_den: "Складывает (вычитает) отдельно числители и знаменатели (local)",
  num_not_scaled: "Приводит к общему знаменателю, но не домножает числители (local)",
  whole_times_both: "Умножает целое и на числитель, и на знаменатель (local)",
  mult_den_instead: "Умножает на целое знаменатель вместо числителя (local)",
  part_only_unit: "Находит одну долю вместо нескольких: делит, но не умножает на числитель (local)",
  divided_instead: "Дробь от числа: делит на дробь вместо умножения (local)",
  div_no_flip: "Делит дроби как умножает: не переворачивает делитель (local)",
  flip_first: "При делении переворачивает делимое, а не делитель (local)",
  whole_minus_num: "Вычитает из целого числитель: 3 − 2/5 = 1/5 (local)",
  whole_lost: "Теряет целые при вычитании дроби: 3 − 2/5 = 3/5 (local)",
  borrow_swap: "В смешанных числах вычитает из большей дроби меньшую, не занимая единицу (local)",
  order_left_to_right: "Выполняет действия слева направо, не видя порядка: + раньше · (local)",
  mixed_whole_only: "Делит на число только целую часть смешанного числа (local)",
  align_right: "Складывает десятичные «по правому краю», а не разряд под разрядом (local)",
  shift_wrong_way: "Сдвигает запятую не в ту сторону (local)",
  append_zero: "Умножая на 10, 100, приписывает нуль после запятой: 2,5 · 10 = 2,50 (local)",
  dec_places_mult: "При умножении десятичных отделяет запятой не сумму знаков (local)",
  comma_lost: "Потерял запятую в произведении (local)",
  dec_div_decimal: "Делит на десятичную дробь, не перенося запятую в делимом (local)",
  frac_bar_is_comma: "Черта дроби — это запятая: 3/4 = 3,4 (local)",
  den_by_digits: "Знаменатель не по числу знаков после запятой: 0,25 = 25/10 (local)",
  sign_of_result: "Модуль верный, знак результата — нет (local)",
  abs_added: "Складывает модули, когда знаки разные: −7 + 3 = −10 (local)",
  mult_sign_rule: "Ошибается в знаке произведения или частного (local)",
  small_minus_big: "Из меньшего вычитает большее «наоборот»: 3 − 8 = 5 (local)",
  inverse_wrong: "Неизвестное находит не тем действием (local)",
  division_always_decreases: "Деление всегда уменьшает: x : 0,5 меньше x (local)",
};
const MSG = {
  sign_rule_over_addition: "«Минус на минус — плюс» — правило умножения, не сложения. Два долга вместе — больше долг: −3 + (−4) = −7.",
  minus_is_operation_only: "Минус в скобке — знак числа, а не действие. Прибавить −3 — то же, что отнять 3.",
  subtraction_always_decreases: "Вычесть отрицательное — значит прибавить противоположное: − (−8) = + 8. Результат больше.",
  longer_record_is_bigger: "Количество цифр не решает. Допиши нули: 0,50 и 0,25 — какое больше?",
  negative_fractions_as_positive: "У отрицательных наоборот: чем больше модуль, тем левее на прямой. −1/3 правее −1/2, значит больше.",
  bigger_denominator: "Чем больше знаменатель, тем мельче доли. 1/8 пиццы меньше 1/3 пиццы.",
  add_num_den: "Знаменатели не складывают: это размер доли. Приведи к общему знаменателю и действуй с числителями.",
  num_not_scaled: "Знаменатель общий, а числители? Домножь каждый числитель на тот же множитель, что и его знаменатель.",
  whole_times_both: "Целое число умножают только на числитель. Если умножить и числитель, и знаменатель, дробь не изменится.",
  mult_den_instead: "Знаменатель увеличился — значит, доли стали мельче. А нужно взять долей больше: умножай числитель.",
  part_only_unit: "Это одна доля. А долей нужно столько, сколько в числителе.",
  divided_instead: "Дробь от числа — умножение: число · дробь. Ответ должен быть меньше числа, если дробь меньше 1.",
  div_no_flip: "Делить на дробь — умножать на перевёрнутую дробь. Переверни делитель.",
  flip_first: "Переворачивают делитель — вторую дробь, а первая остаётся как есть.",
  whole_minus_num: "Из целого не вычитают числитель. Запиши целое дробью с тем же знаменателем: 3 = 15/5.",
  whole_lost: "Куда делись целые? 3 − 2/5 — это 2 и ещё 3/5.",
  borrow_swap: "Вычитаемая дробь больше уменьшаемой — займи одну единицу у целой части.",
  order_left_to_right: "Сначала умножение и деление, потом сложение и вычитание.",
  mixed_whole_only: "Делить нужно всё смешанное число, а не только целую часть. Переведи его в неправильную дробь.",
  align_right: "Пиши запятую под запятой: целые с целыми, десятые с десятыми.",
  shift_wrong_way: "Запятая сдвинулась не туда. При умножении на 10 число растёт, при делении — уменьшается.",
  append_zero: "Нуль после запятой ничего не меняет: 2,50 = 2,5. При умножении на 10 сдвигай запятую вправо.",
  dec_places_mult: "В произведении после запятой столько знаков, сколько у обоих множителей вместе.",
  comma_lost: "Цифры верные, а запятая? Сосчитай знаки после запятой у множителей.",
  dec_div_decimal: "Сделай делитель целым: перенеси запятую в обоих числах на одинаковое число знаков.",
  frac_bar_is_comma: "Черта дроби — это деление, а не запятая: 3/4 = 3 : 4.",
  den_by_digits: "Знаков после запятой два — значит, сотые: знаменатель 100.",
  sign_of_result: "Число верное, знак — нет. Прикинь по прямой, где окажется результат: левее или правее нуля.",
  abs_added: "Знаки разные — модули вычитают, а знак берут у числа с большим модулем.",
  mult_sign_rule: "Сосчитай минусы среди множителей: чётное число — плюс, нечётное — минус.",
  small_minus_big: "Из меньшего вычитаем большее — результат отрицательный: 3 − 8 = −5.",
  inverse_wrong: "Проверь подстановкой: поставь свой ответ в окошко — получается равенство?",
  division_always_decreases: "Делить на число меньше 1 — значит, число растёт: x : 0,5 = 2x.",
};

// ── Навыки ──
const SK = {
  frac: { title: "Обыкновенные дроби", node: "math_fraction_ops (local)" },
  dec: { title: "Десятичные дроби", node: "math_decimal_ops (local)" },
  neg: { title: "Отрицательные числа", node: "math_negative_as_direction" },
  cmp: { title: "Сравнение", node: "math_compare_by_position_not_digits" },
};
const HINTS = {
  frac: ["Знаменатели одинаковые? Если нет — какой общий?", "Складывают и вычитают числители при общем знаменателе. Умножают «числитель на числитель, знаменатель на знаменатель». Делят — умножая на перевёрнутую дробь."],
  dec: ["Сколько знаков после запятой у каждого числа?", "Сложение — запятая под запятой. Умножение — как целые, потом отдели столько знаков, сколько у множителей вместе. Деление на дробь — сначала сделай делитель целым."],
  neg: ["Где окажется ответ — левее или правее нуля?", "Прибавить отрицательное — сдвиг влево. Вычесть отрицательное — сдвиг вправо. Умножение: чётное число минусов — плюс."],
  cmp: ["Где эти числа на прямой?", "Больше то, что правее. Приведи к одному виду: обе — десятичные или обе — обыкновенные с общим знаменателем."],
};

// ── Шаблоны ──
// gen() → { expr, ask?, ans: F | ">"|"<"|"=", traps: [{code, val}], hint3, form?: "dec"|"frac" }
const T = {}; for (const s of Object.keys(SK)) T[s] = { 1: [], 2: [], 3: [] };
const def = (skill, level, id, gen) => T[skill][level].push({ id, gen });
const tr = (code, val) => ({ code, val });

// 1. Обыкновенные дроби
def("frac", 1, "same_den_add", () => { const b = ri(5, 15), a = ri(1, b - 2), c = ri(1, b - 1);
  return { expr: `${fr(a, b)}+${fr(c, b)}`, ans: f(a + c, b), traps: [tr("add_num_den", f(a + c, 2 * b))], hint3: `Знаменатель общий — ${b}. Сложи числители: ${a} + ${c}. Сократи, если можно.` }; });
def("frac", 1, "same_den_sub", () => { const b = ri(5, 15), a = ri(2, b - 1), c = ri(1, a - 1), w = pick([0, 0, ri(1, 3)]);
  const L = w ? `${w}${fr(a, b)}` : fr(a, b);
  return { expr: `${L}-${fr(c, b)}`, ans: f(w * b + a - c, b), traps: [tr("whole_lost", f(a - c, b))], hint3: `Знаменатель ${b} остаётся. Вычти числители: ${a} − ${c}${w ? `. Целые ${w} не трогай` : ""}.` }; });
def("frac", 1, "whole_times", () => { const b = ri(3, 12), a = coprime(b), n = ri(2, 9);
  return { expr: pick([`${n}*${fr(a, b)}`, `${fr(a, b)}*${n}`]), ans: f(n * a, b), traps: [tr("whole_times_both", f(a, b)), tr("mult_den_instead", f(a, n * b))], hint3: `${n} · ${a}/${b} = (${n} · ${a})/${b}. Знаменатель не меняется.` }; });
def("frac", 1, "frac_of_num", () => { const b = ri(2, 10), a = coprime(b), N = b * ri(2, 9);
  return { ask: "Найдите дробь от числа", expr: `${fr(a, b)} от ${N}`, ans: f(N * a, b), traps: [tr("part_only_unit", f(N, b)), tr("divided_instead", f(N * b, a))], hint3: `${N} : ${b} = ${N / b} — одна ${b}-я часть. А частей нужно ${a}.` }; });

def("frac", 2, "diff_den_add", () => { const b = pick([2, 3, 4, 5, 6]), d = pick([b * pick([2, 3]), pick([2, 3, 4, 5, 7].filter((x) => gcd(x, b) === 1))]), a = coprime(b), c = coprime(d), L = lcm(b, d);
  return { expr: `${fr(a, b)}+${fr(c, d)}`, ans: f(a, b).add(f(c, d)), traps: [tr("add_num_den", f(a + c, b + d)), tr("num_not_scaled", f(a + c, L))], hint3: `Общий знаменатель ${L}: ${a}/${b} = ${a * L / b}/${L}, ${c}/${d} = ${c * L / d}/${L}.` }; });
def("frac", 2, "diff_den_sub", () => { let b = pick([2, 3, 4, 5, 6]), d = pick([b * 2, b * 3, pick([2, 3, 5, 7].filter((x) => gcd(x, b) === 1))]), a = coprime(b), c = coprime(d);
  if (f(a, b).cmp(f(c, d)) < 0) [a, b, c, d] = [c, d, a, b];
  if (f(a, b).eq(f(c, d))) a = b - 1 || 1;
  const L = lcm(b, d), traps = [tr("num_not_scaled", f(a - c, L))]; if (b !== d && a !== c) traps.unshift(tr("add_num_den", f(Math.abs(a - c), Math.abs(b - d))));
  return { expr: `${fr(a, b)}-${fr(c, d)}`, ans: f(a, b).sub(f(c, d)), traps, hint3: `Общий знаменатель ${L}: ${a * L / b}/${L} − ${c * L / d}/${L}.` }; });
def("frac", 2, "mult_fr", () => { const b = ri(2, 9), d = ri(2, 9), a = coprime(b), c = coprime(d);
  return { expr: `${fr(a, b)}*${fr(c, d)}`, ans: f(a * c, b * d), traps: [], hint3: `(${a} · ${c})/(${b} · ${d}). Сократи до умножения, если можно.` }; });
def("frac", 2, "div_fr", () => { const b = ri(2, 9), d = ri(2, 9), a = coprime(b), c = coprime(d);
  return { expr: `${fr(a, b)}:${fr(c, d)}`, ans: f(a, b).div(f(c, d)), traps: [tr("div_no_flip", f(a * c, b * d)), tr("flip_first", f(b * c, a * d))], hint3: `${a}/${b} : ${c}/${d} = ${a}/${b} · ${d}/${c}.` }; });
def("frac", 2, "whole_minus_frac", () => { const N = ri(1, 5), b = ri(3, 9), a = coprime(b);
  const traps = []; if (N > a) traps.push(tr("whole_minus_num", f(N - a, b))); if (N >= 2) traps.push(tr("whole_lost", f(b - a, b)));
  return { expr: `${N}-${fr(a, b)}`, ans: f(N).sub(f(a, b)), traps, hint3: `${N} = ${N - 1} и ${b}/${b}. ${b}/${b} − ${a}/${b} = ${b - a}/${b}.` }; });

def("frac", 3, "mixed_add", () => { const p = ri(1, 5), r = ri(1, 5), b = pick([2, 3, 4, 5, 6]), d = pick([3, 4, 6, 8, 10].filter((x) => x !== b)), a = coprime(b), c = coprime(d);
  return { expr: `${p}${fr(a, b)}+${r}${fr(c, d)}`, ans: f(p * b + a, b).add(f(r * d + c, d)), traps: [tr("add_num_den", f(p + r).add(f(a + c, b + d)))], hint3: `Целые: ${p} + ${r} = ${p + r}. Дроби: ${a}/${b} + ${c}/${d} — к знаменателю ${lcm(b, d)}.` }; });
def("frac", 3, "mixed_sub_borrow", () => { const b = ri(5, 12); let a = ri(1, b - 2), c = ri(a + 1, b - 1); const p = ri(2, 8), r = ri(1, p - 1);
  return { expr: `${p}${fr(a, b)}-${r}${fr(c, b)}`, ans: f(p * b + a, b).sub(f(r * b + c, b)), traps: [tr("borrow_swap", f(p - r).add(f(c - a, b)))], hint3: `${a}/${b} меньше ${c}/${b} — займи единицу: ${p} ${a}/${b} = ${p - 1} ${a + b}/${b}.` }; });
def("frac", 3, "order", () => { const b = pick([2, 3, 4, 5, 6]), a = coprime(b), d = ri(2, 7), c = coprime(d), e = ri(1, 9), g = pick([2, 3, 4, 5].filter((x) => gcd(x, e) === 1 || x === 2));
  const x = f(a, b), y = f(c, d), z = f(e, g);
  return { expr: `${fr(a, b)}+${fr(c, d)}*${frF(z)}`, ans: x.add(y.mul(z)), traps: [tr("order_left_to_right", x.add(y).mul(z))], hint3: `Сначала ${c}/${d} · ${frF(z).replace(/[[\]]/g, "")} = ${frF(y.mul(z)).replace(/[[\]]/g, "")}, потом прибавь ${a}/${b}.` }; });
def("frac", 3, "mixed_div_int", () => { const n = ri(2, 6), b = ri(2, 9), q = coprime(b), p = ri(1, 9);
  return { expr: `${p}${fr(q, b)}:${n}`, ans: f(p * b + q, b).div(f(n)), traps: [tr("mixed_whole_only", f(p, n).add(f(q, b)))], hint3: `${p} ${q}/${b} = ${p * b + q}/${b}. Теперь раздели на ${n}: знаменатель умножь на ${n}.` }; });

// 2. Десятичные дроби
def("dec", 1, "dec_int_add", () => { const x = dec(nonRound(11, 99), 1), N = ri(2, 9), s = pick([`${D(x)}+${N}`, `${N}+${D(x)}`]);
  return { expr: s, ans: x.add(f(N)), traps: [tr("align_right", x.add(f(N, 10)))], hint3: `${N} = ${N},0. Целые — с целыми: ${Math.floor(x.v)} + ${N}.`, form: "dec" }; });
def("dec", 1, "dec_pm1", () => { let x = dec(nonRound(5, 99), 1), y = dec(nonRound(5, 99), 1); const op = pick(["+", "-"]);
  if (op === "-" && x.cmp(y) < 0) [x, y] = [y, x]; if (x.eq(y)) x = x.add(f(1));
  return { expr: `${D(x)}${op}${D(y)}`, ans: op === "+" ? x.add(y) : x.sub(y), traps: [], hint3: `В десятых: ${x.n * 10 / x.d} ${op === "+" ? "+" : "−"} ${y.n * 10 / y.d} десятых.`, form: "dec" }; });
def("dec", 1, "dec_shift", () => { const x = dec(nonRound(1, 999), pick([1, 2])); const [op, k] = pick([["*", 10], ["*", 100], [":", 10], [":", 100], ["*", 1000]]);
  const ans = op === "*" ? x.mul(f(k)) : x.div(f(k)), wrong = op === "*" ? x.div(f(k)) : x.mul(f(k));
  const traps = [tr("shift_wrong_way", wrong)]; if (op === "*") traps.push(tr("append_zero", x));
  const z = String(k).length - 1;
  return { expr: `${D(x)}${op}${k}`, ans, traps, hint3: `${op === "*" ? "Умножение" : "Деление"} на ${k}: запятая сдвигается ${op === "*" ? "вправо" : "влево"} на ${z} ${z === 1 ? "знак" : "знака"}.`, form: "dec" }; });

def("dec", 2, "dec_align", () => { const aI = nonRound(1, 39), bI = nonRound(1, 99), x = dec(aI, 1), y = dec(bI, 2);
  const op = pick(["+", "-"]), sw = op === "-" && x.cmp(y) < 0;
  const [L, R] = op === "+" ? pick([[x, y], [y, x]]) : sw ? [y, x] : [x, y];
  const ans = op === "+" ? x.add(y) : L.sub(R);
  const traps = []; if (op === "+") traps.push(tr("align_right", dec(aI + bI, 2))); else if (!sw && aI > bI) traps.push(tr("align_right", dec(aI - bI, 2)));
  return { expr: `${D(L)}${op}${D(R)}`, ans, traps, hint3: `Уравняй знаки: ${D(x).replace(".", ",")} = ${D(x).replace(".", ",")}0. Теперь сотые с сотыми.`, form: "dec" }; });
def("dec", 2, "dec_mul", () => { const aI = pick([ri(2, 9), ri(11, 25)]), bI = ri(2, 9), pa = 1, pb = pick([0, 1, 1, 2]);
  const x = dec(aI, pa), y = dec(bI, pb), ans = x.mul(y), traps = [tr("comma_lost", f(aI * bI))];
  if (pb > 0) traps.unshift(tr("dec_places_mult", dec(aI * bI, Math.max(pa, pb))));
  const [L, R] = pick([[x, y], [y, x]]);
  return { expr: `${D(L)}*${D(R)}`, ans, traps, hint3: `${aI} · ${bI} = ${aI * bI}. Знаков после запятой: ${pa} + ${pb} = ${pa + pb}.`, form: "dec" }; });
def("dec", 2, "dec_div", () => { if (Math.random() < 0.5) { const n = ri(2, 9), q = nonRound(2, 40);
    return { expr: `${D(dec(q * n, 1))}:${n}`, ans: dec(q, 1), traps: [tr("comma_lost", f(q))], hint3: `${q * n} десятых : ${n} = ${q} десятых.`, form: "dec" }; }
  const dI = ri(2, 9), q = ri(2, 12);
  return { expr: `${D(dec(q * dI, 1))}:${D(dec(dI, 1))}`, ans: f(q), traps: [tr("dec_div_decimal", f(q, 10)), tr("shift_wrong_way", f(q * 10))], hint3: `Перенеси запятую на 1 знак в обоих числах: ${q * dI} : ${dI}.`, form: "dec" }; });
def("dec", 2, "frac_to_dec", () => { const d = pick([2, 4, 5, 8, 20, 25, 40, 50]), n = coprime(d) + (Math.random() < 0.3 ? d * ri(1, 2) : 0);
  let P10 = 10; while (P10 % d) P10 *= 10;
  return { ask: "Запишите десятичной дробью", expr: fr(n, d), ans: f(n, d), traps: [tr("frac_bar_is_comma", fromStr(`${n}.${d}`))], hint3: `Приведи к знаменателю ${P10}: ${n}/${d} = ${n * P10 / d}/${P10}.`, form: "dec" }; });
def("dec", 2, "dec_to_frac", () => { const k = pick([1, 2, 2]); const I = nonRound(1, 10 ** k - 1), x = dec(I, k);
  const traps = []; if (k > 1) traps.push(tr("den_by_digits", f(I, 10 ** (k - 1))));
  return { ask: "Запишите обыкновенной дробью и сократите", expr: D(x), ans: x, traps, hint3: `${D(x).replace(".", ",")} = ${I}/${10 ** k}. Сократи.`, form: "frac" }; });

def("dec", 3, "dec_frac_mix", () => { const x = fromStr(pick(["0.25", "0.5", "0.75", "0.2", "0.4", "0.6", "0.8", "1.5", "0.125", "1.25"])); const d = pick([2, 3, 4, 5, 6, 8]), y = f(coprime(d), d); const op = pick(["+", "-", "*"]);
  const yFirst = Math.random() < 0.5, [L, R] = yFirst ? [y, x] : [x, y], ls = yFirst ? frF(y) : D(x), rs = yFirst ? D(x) : frF(y);
  const ans = op === "+" ? L.add(R) : op === "-" ? L.sub(R) : L.mul(R);
  return { expr: `${ls}${op}${rs}`, ans, traps: [], hint3: `${D(x).replace(".", ",")} = ${frF(x).replace(/[[\]]/g, "")}. Дальше — как с обыкновенными.` }; });
def("dec", 3, "dec_div_dec", () => { const dI = ri(2, 9), q = ri(2, 15);
  return { expr: `${D(dec(q * dI, 2))}:${D(dec(dI, 2))}`, ans: f(q), traps: [tr("dec_div_decimal", f(q, 10)), tr("shift_wrong_way", f(q * 10))], hint3: `Перенеси запятую на 2 знака в обоих: ${q * dI} : ${dI}.`, form: "dec" }; });
def("dec", 3, "dec_chain", () => { const xI = ri(2, 9), yI = ri(2, 9), zI = nonRound(1, 99), x = dec(xI, 1), y = dec(yI, 1), z = dec(zI, 2);
  return { expr: `${D(x)}*${D(y)}+${D(z)}`, ans: x.mul(y).add(z), traps: [tr("order_left_to_right", x.mul(y.add(z))), tr("dec_places_mult", dec(xI * yI, 1).add(z))], hint3: `Сначала ${D(x).replace(".", ",")} · ${D(y).replace(".", ",")} = ${D(x.mul(y)).replace(".", ",")}, потом прибавь.`, form: "dec" }; });

// 3. Отрицательные числа
def("neg", 1, "add_same", () => { const a = ri(2, 20), b = ri(2, 20);
  return { expr: `-${a}+(-${b})`, ans: f(-a - b), traps: [tr("sign_rule_over_addition", f(a + b)), tr("minus_is_operation_only", f(-a + b))], hint3: `Был долг ${a}, добавили долг ${b}. Сколько всего долга?` }; });
def("neg", 1, "add_diff", () => { let a = ri(1, 20), b = ri(1, 20); if (a === b) b++;
  if (Math.random() < 0.5) return { expr: `${a}+(-${b})`, ans: f(a - b), traps: [tr("minus_is_operation_only", f(a + b)), tr("sign_of_result", f(b - a))], hint3: `От ${a} шаг влево на ${b}.` };
  return { expr: `-${a}+${b}`, ans: f(b - a), traps: [tr("abs_added", f(-a - b)), tr("sign_of_result", f(a - b))], hint3: `От −${a} шаг вправо на ${b}. Перейдёшь через нуль?` }; });
def("neg", 1, "mult", () => { const a = ri(2, 12), b = ri(2, 12), m = pick([[-1, 1], [1, -1], [-1, -1]]);
  const [x, y] = [m[0] * a, m[1] * b];
  return { expr: `${x < 0 ? `(${x})` : x}*${P(y)}`, ans: f(x * y), traps: [tr("mult_sign_rule", f(-x * y))], hint3: `${a} · ${b} = ${a * b}. Минусов: ${m.filter((s) => s < 0).length}.` }; });

def("neg", 2, "sub_neg", () => { const a = ri(2, 20), b = ri(2, 20), s = pick([1, -1]);
  return { expr: `${s * a}-(-${b})`, ans: f(s * a + b), traps: [tr("subtraction_always_decreases", f(s * a - b)), tr("sign_of_result", f(-(s * a + b)))], hint3: `− (−${b}) = + ${b}. Значит, ${s * a < 0 ? "−" : ""}${a} + ${b}.` }; });
def("neg", 2, "small_minus_big", () => { const a = ri(1, 15), b = a + ri(1, 20);
  return { expr: `${a}-${b}`, ans: f(a - b), traps: [tr("small_minus_big", f(b - a))], hint3: `От ${a} шаг влево на ${b}: до нуля ${a}, ещё ${b - a} за нулём.` }; });
def("neg", 2, "div", () => { const q = ri(2, 9), b = ri(2, 9), m = pick([[-1, 1], [1, -1], [-1, -1]]);
  const x = m[0] * q * b, y = m[1] * b;
  return { expr: `${x < 0 ? `(${x})` : x}:${P(y)}`, ans: f(x / y), traps: [tr("mult_sign_rule", f(-x / y))], hint3: `${q * b} : ${b} = ${q}. Минусов: ${m.filter((s) => s < 0).length}.` }; });
def("neg", 2, "neg_dec", () => { const x = dec(nonRound(1, 50), 1), y = dec(nonRound(1, 50), 1); const k = pick(["mp", "mm", "pm"]);
  if (k === "mp") { const ans = x.neg().add(y); return { expr: `-${D(x)}+${D(y)}`, ans, traps: [tr("abs_added", x.add(y).neg()), tr("sign_of_result", ans.neg())], hint3: "Знаки разные: из большего модуля вычти меньший, знак — у большего.", form: "dec" }; }
  if (k === "mm") return { expr: `-${D(x)}-${D(y)}`, ans: x.add(y).neg(), traps: [tr("sign_rule_over_addition", x.add(y)), tr("abs_added", x.sub(y).neg())], hint3: "Влево, и ещё влево: модули складываются, знак минус.", form: "dec" };
  const [s, t] = x.cmp(y) < 0 ? [x, y] : [y, x.eq(y) ? x.add(f(1)) : x];
  return { expr: `${D(s)}-${D(t)}`, ans: s.sub(t), traps: [tr("small_minus_big", t.sub(s))], hint3: "Вычитаем большее из меньшего — ответ отрицательный.", form: "dec" }; });

def("neg", 3, "chain", () => { const a = ri(1, 15), b = ri(1, 15), c = ri(1, 15), d = ri(1, 15);
  return { expr: `${a}-${b}+(-${c})-(-${d})`, ans: f(a - b - c + d), traps: [tr("subtraction_always_decreases", f(a - b - c - d)), tr("minus_is_operation_only", f(a - b + c + d))], hint3: `Перепиши без скобок: ${a} − ${b} − ${c} + ${d}.` }; });
def("neg", 3, "missing", () => { const a = ri(2, 15), b = ri(2, 15); const k = pick([0, 1, 2]);
  if (k === 0) return { ask: "Какое число в окошке?", expr: `□+(-${a})=${b}`, ans: f(a + b), traps: [tr("inverse_wrong", f(b - a))], hint3: `□ − ${a} = ${b}. Значит □ = ${b} + ${a}.` };
  if (k === 1) return { ask: "Какое число в окошке?", expr: `□-${a}=-${b}`, ans: f(a - b), traps: [tr("inverse_wrong", f(-b - a))], hint3: `□ = −${b} + ${a}.` };
  return { ask: "Какое число в окошке?", expr: `-${a}-□=${b}`, ans: f(-a - b), traps: [tr("inverse_wrong", f(b + a))], hint3: `□ = −${a} − ${b}.` }; });
def("neg", 3, "neg_frac", () => { const b = pick([2, 3, 4, 5, 6]), d = pick([2, 3, 4, 5, 6, 8].filter((x) => x !== b)), a = coprime(b), c = coprime(d);
  if (Math.random() < 0.5) { const ans = f(-a, b).add(f(c, d)); return { expr: `${fr(-a, b)}+${fr(c, d)}`, ans, traps: [tr("sign_of_result", ans.neg()), tr("add_num_den", f(c - a, b + d)), tr("abs_added", f(a, b).add(f(c, d)).neg())], hint3: `Общий знаменатель ${lcm(b, d)}: −${a * lcm(b, d) / b}/${lcm(b, d)} + ${c * lcm(b, d) / d}/${lcm(b, d)}.` }; }
  const ans = f(a * c, b * d); return { expr: `${fr(-a, b)}*(${fr(-c, d)})`, ans, traps: [tr("mult_sign_rule", ans.neg())], hint3: "Минус на минус при умножении — плюс. Дальше — числители и знаменатели." }; });
def("neg", 3, "mult3", () => { const xs = [ri(2, 6), ri(2, 5), ri(2, 5)].map((v) => v * pick([1, -1])); if (xs.every((v) => v > 0)) xs[1] = -xs[1];
  const p = xs.reduce((s, v) => s * v, 1);
  return { expr: xs.map((v, i) => (v < 0 ? `(${v})` : `${v}`)).join("*"), ans: f(p), traps: [tr("mult_sign_rule", f(-p))], hint3: `Модуль: ${xs.map(Math.abs).join(" · ")} = ${Math.abs(p)}. Минусов: ${xs.filter((v) => v < 0).length}.` }; });

// 4. Сравнение (ответ — знак)
const sgn = (x, y) => [">", "=", "<"][1 - x.cmp(y)];
const flip = (s) => (s === ">" ? "<" : s === "<" ? ">" : "=");
const cmpT = (L, R, ls, rs, traps, hint3) => ({ kind: "cmp", expr: `${ls}?${rs}`, ans: sgn(L, R), traps, hint3, L, R });
def("cmp", 1, "dec_len", () => { const aI = ri(1, 9), bI = Math.random() < 0.7 ? nonRound(11, aI * 10 - 1 > 11 ? aI * 10 - 1 : 19) : nonRound(aI * 10 + 1, 99);
  const x = dec(aI, 1), y = dec(bI, 2), swap = Math.random() < 0.5;
  const [L, R] = swap ? [y, x] : [x, y];
  return cmpT(L, R, D(L), D(R), [tr("longer_record_is_bigger", swap ? ">" : "<")], `Допиши нуль: ${D(x).replace(".", ",")} = ${D(x).replace(".", ",")}0. Теперь сотые с сотыми.`); });
def("cmp", 1, "unit", () => { const k = pick([1, 1, ri(2, 5)]); let a, b; do { a = ri(k + 1, 12); b = ri(k + 1, 12); } while (a === b || gcd(a, k) > 1 || gcd(b, k) > 1);
  const L = f(k, a), R = f(k, b);
  return cmpT(L, R, fr(k, a), fr(k, b), [tr("bigger_denominator", a > b ? ">" : "<")], `Числители одинаковые — ${k}. Доли какого размера крупнее: ${a}-е или ${b}-е?`); });
def("cmp", 1, "neg_int", () => { let a = ri(1, 30), b = ri(1, 30); if (a === b) b++;
  const L = f(-a), R = f(-b);
  return cmpT(L, R, `-${a}`, `-${b}`, [tr("negative_fractions_as_positive", a > b ? ">" : "<")], `Какое из чисел ближе к нулю? Оно правее.`); });

def("cmp", 2, "neg_frac", () => { if (Math.random() < 0.5) { let a = ri(2, 9), b = ri(2, 9); if (a === b) b++; const L = f(-1, a), R = f(-1, b);
    return cmpT(L, R, fr(-1, a), fr(-1, b), [tr("negative_fractions_as_positive", a < b ? ">" : "<")], `1/${Math.min(a, b)} больше 1/${Math.max(a, b)}. А с минусом — наоборот.`); }
  let aI = ri(1, 9), bI = ri(1, 9); if (aI === bI) bI = aI === 9 ? 8 : aI + 1; const L = dec(-aI, 1), R = dec(-bI, 1);
  return cmpT(L, R, D(L), D(R), [tr("negative_fractions_as_positive", aI < bI ? "<" : ">")], `Отметь ${D(L).replace(".", ",").replace("-", "−")} и ${D(R).replace(".", ",").replace("-", "−")} на прямой. Правее — больше.`); });
def("cmp", 2, "frac_dec", () => { const d = pick([2, 4, 5, 8, 20, 25]), n = coprime(d), x = f(n, d); const mode = pick(["eq", "near", "near"]);
  let y = x; if (mode === "near") { const s = decStr(x), k = s.split(".")[1].length; y = x.add(f(pick([-1, 1]) * pick([1, 2, 5]), 10 ** k)); if (y.v <= 0) y = x.add(f(1, 10 ** k)); }
  const swap = Math.random() < 0.5, [L, R] = swap ? [y, x] : [x, y];
  return cmpT(L, R, swap ? D(y) : fr(n, d), swap ? fr(n, d) : D(y), [], `${n}/${d} = ${D(x).replace(".", ",")}. Теперь сравни две десятичные.`); });
def("cmp", 2, "frac_diff", () => { let a, b, c, d; do { b = ri(3, 12); d = ri(3, 12); a = coprime(b); c = coprime(d); } while (b === d || f(a, b).eq(f(c, d)) || (b > d) !== (f(a, b).cmp(f(c, d)) < 0));
  const L = f(a, b), R = f(c, d);
  return cmpT(L, R, fr(a, b), fr(c, d), [tr("bigger_denominator", b > d ? ">" : "<")], `Общий знаменатель ${lcm(b, d)}: ${a * lcm(b, d) / b} и ${c * lcm(b, d) / d}.`); });

def("cmp", 3, "neg_mixed", () => { const d = pick([3, 4, 5, 6, 7, 8, 9]), n = coprime(d); let k = ri(1, 9); let y = dec(k, 1); if (y.eq(f(n, d))) y = dec(k === 9 ? 8 : k + 1, 1);
  const x = f(-n, d), yy = y.neg(), swap = Math.random() < 0.5, [L, R] = swap ? [yy, x] : [x, yy];
  return cmpT(L, R, swap ? D(yy) : fr(-n, d), swap ? fr(-n, d) : D(yy), [tr("negative_fractions_as_positive", flip(sgn(L, R)))], `Сравни модули: ${n}/${d} ≈ ${(n / d).toFixed(2).replace(".", ",")} и ${D(y).replace(".", ",")}. У отрицательных больше то, чей модуль меньше.`); });
def("cmp", 3, "result", () => { const a = ri(2, 15), b = ri(2, 15);
  if (Math.random() < 0.5) { const L = f(-a + b), R = f(-a); return cmpT(L, R, `-${a}-(-${b})`, `-${a}`, [tr("subtraction_always_decreases", "<")], `− (−${b}) — это сдвиг вправо на ${b}.`); }
  const x = dec(nonRound(11, 99), 1), k = pick(["0.5", "0.2", "0.1", "0.25"]), L = x.div(fromStr(k));
  return cmpT(L, x, `${D(x)}:${k}`, D(x), [tr("division_always_decreases", "<")], `Сколько раз ${k.replace(".", ",")} помещается в 1? Значит, ${D(x).replace(".", ",")} : ${k.replace(".", ",")} = ${D(x).replace(".", ",")} · ${fromStr(k).div(f(1)).d / fromStr(k).n}.`); });

// ── Сборка задания ──
function makeTask(skill, level, tplId) {
  const list = T[skill][level];
  const tpl = tplId ? list.find((t) => t.id === tplId) : pick(list);
  const g = tpl.gen();
  const kind = g.kind || "num";
  const traps = [];
  for (const t of g.traps) {
    if (kind === "cmp") { if (t.val !== g.ans && !traps.some((u) => u.val === t.val)) traps.push(t); continue; }
    if (!t.val.eq(g.ans) && !traps.some((u) => u.val.eq(t.val))) traps.push(t);
  }
  return { skill, level, kind, template: `${skill}.${tpl.id}`, item_id: `${skill}.${tpl.id}:${g.expr}`, expr: g.expr, ask: g.ask || (kind === "cmp" ? "Сравните: поставьте знак >, < или =" : "Вычислите устно"), ans: g.ans, traps, hint3: g.hint3, form: g.form || null, node: SK[skill].node };
}

// ── Разбор ответа ученика ──
function parseAnswer(raw) {
  let c = String(raw).trim().replace(/[−–—]/g, "-").replace(/,/g, ".").replace(/\s+/g, " ").replace(/^\((.*)\)$/, "$1").trim();
  let m;
  if ((m = c.match(/^(-?) ?(\d+)$/))) return { val: f((m[1] ? -1 : 1) * Number(m[2])), form: "int" };
  if ((m = c.match(/^(-?) ?(\d*)\.(\d+)$/))) return { val: fromStr(`${m[1]}${m[2] || "0"}.${m[3]}`), form: "dec" };
  if ((m = c.match(/^(-?) ?(\d+) ?\/ ?(\d+)$/))) { const n = +m[2], d = +m[3]; if (!d) return null; return { val: f((m[1] ? -1 : 1) * n, d), form: "frac", reducible: gcd(n, d) > 1 }; }
  if ((m = c.match(/^(-?) ?(\d+) (\d+) ?\/ ?(\d+)$/))) { const w = +m[2], n = +m[3], d = +m[4]; if (!d) return null; return { val: f((m[1] ? -1 : 1) * (w * d + n), d), form: "mixed", reducible: gcd(n, d) > 1, improper: n >= d }; }
  return null;
}

function check(task, raw) {
  if (task.kind === "cmp") {
    const s = String(raw).trim();
    if (!["<", ">", "="].includes(s)) return { state: "format", msg: "Выбери знак: >, < или =." };
    if (s === task.ans) return { state: "ok" };
    for (const t of task.traps) if (s === t.val) return { state: "miss", code: t.code, msg: MSG[t.code] };
    return { state: "miss", code: null, msg: "Не так. Отметь оба числа на прямой: правее — больше." };
  }
  const p = parseAnswer(raw);
  if (!p) return { state: "format", msg: "Запиши число: −7, 2,5, 3/4 или смешанное 2 1/3." };
  if (task.form === "dec" && p.form !== "dec" && p.form !== "int") {
    if (p.val.eq(task.ans) && decStr(task.ans)) return { state: "format", msg: "Верно по значению, но запиши десятичной дробью — через запятую." };
  }
  if (task.form === "frac" && p.form === "dec") return { state: "format", msg: "Запиши обыкновенной дробью: числитель / знаменатель." };
  if (p.val.eq(task.ans)) {
    if (p.improper) return { state: "format", msg: "Верно, но в смешанном числе дробная часть должна быть меньше 1." };
    if (p.reducible) return { state: "format", msg: "Верно, но дробь можно сократить. Сократи до конца." };
    return { state: "ok" };
  }
  for (const t of task.traps) if (p.val.eq(t.val)) return { state: "miss", code: t.code, msg: MSG[t.code] };
  const v = task.ans.v;
  if (v !== 0 && Math.sign(p.val.v) !== Math.sign(v)) return { state: "miss", code: null, msg: `Прикинь знак: ответ ${v < 0 ? "отрицательный" : "положительный"}. Где он окажется на прямой?` };
  const m = Math.abs(v), lo = Number.isInteger(m) ? m - 1 : Math.floor(m);
  return { state: "miss", code: null, msg: `Не сходится. Прикинь: ответ ${v < 0 ? "отрицательный" : "положительный"}, ${m < 1 ? "по модулю меньше 1" : `по модулю больше ${lo}`}.` };
}

// Строка ответа (для самопроверки и показа решения)
function ansStr(task, val) {
  if (task.kind === "cmp") return val;
  if (task.form === "dec" && decStr(val)) return decStr(val).replace(".", ",");
  return val.d === 1 ? String(val.n) : `${val.n}/${val.d}`;
}

root.MentalBank = { F, f, SK, T, CODES, MSG, HINTS, makeTask, check, parseAnswer, decStr, ansStr };
})(typeof window !== "undefined" ? window : globalThis);
