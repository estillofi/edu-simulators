// kori-algebra — разбор и сравнение буквенных выражений для тренажёров Корифея.
// Ученик вводит как в тетради: 5x − 5, -6xy, 2,5a+b, 3(x-1). Выражение приводится
// к многочлену (одночлен → коэффициент-дробь); сравнение — по многочленам.
(function (root) {
  "use strict";

  // ── Дроби ──
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  class Q {
    constructor(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g; }
    static of(x) {
      if (x instanceof Q) return x;
      const s = String(x);
      if (s.includes(".")) { const [i, f] = s.split("."); const d = 10 ** f.length; return new Q(Math.round(Number(s) * d), d); }
      return new Q(Number(s), 1);
    }
    add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return this.add(o.neg()); }
    mul(o) { return new Q(this.n * o.n, this.d * o.d); }
    div(o) { if (o.n === 0) throw new Error("деление на ноль"); return new Q(this.n * o.d, this.d * o.n); }
    neg() { return new Q(-this.n, this.d); }
    isZero() { return this.n === 0; }
    eq(o) { return this.n === o.n && this.d === o.d; }
    val() { return this.n / this.d; }
  }

  // ── Многочлен: Map «x^2*y» → Q ──
  const monoKey = (vars) => Object.keys(vars).filter((v) => vars[v]).sort().map((v) => (vars[v] === 1 ? v : `${v}^${vars[v]}`)).join("*");
  const parseKey = (k) => { const o = {}; if (!k) return o; for (const p of k.split("*")) { const [v, e] = p.split("^"); o[v] = e ? Number(e) : 1; } return o; };
  class Poly {
    constructor(m = new Map()) { this.m = m; }
    static num(q) { const p = new Poly(); if (!q.isZero()) p.m.set("", q); return p; }
    static vr(v) { return new Poly(new Map([[v, new Q(1)]])); }
    clone() { return new Poly(new Map(this.m)); }
    add(o) { const r = this.clone(); for (const [k, c] of o.m) { const s = (r.m.get(k) || new Q(0)).add(c); s.isZero() ? r.m.delete(k) : r.m.set(k, s); } return r; }
    neg() { const r = new Poly(); for (const [k, c] of this.m) r.m.set(k, c.neg()); return r; }
    sub(o) { return this.add(o.neg()); }
    mul(o) {
      let r = new Poly();
      for (const [k1, c1] of this.m) for (const [k2, c2] of o.m) {
        const a = parseKey(k1), b = parseKey(k2);
        for (const v in b) a[v] = (a[v] || 0) + b[v];
        r = r.add(new Poly(new Map([[monoKey(a), c1.mul(c2)]])));
      }
      return r;
    }
    pow(n) { let r = Poly.num(new Q(1)); for (let i = 0; i < n; i++) r = r.mul(this); return r; }
    isConst() { return [...this.m.keys()].every((k) => k === ""); }
    constVal() { return this.m.get("") || new Q(0); }
    eq(o) { if (this.m.size !== o.m.size) return false; for (const [k, c] of this.m) { const d = o.m.get(k); if (!d || !d.eq(c)) return false; } return true; }
    evalAt(env) { let s = 0; for (const [k, c] of this.m) { let t = c.val(); const v = parseKey(k); for (const x in v) t *= (env[x] ?? 0) ** v[x]; s += t; } return s; }
    terms() { return this.m.size; }
  }

  // ── Лексер и разбор ──
  const LOOK = { "а": "a", "б": "b", "в": "b", "с": "c", "д": "d", "е": "e", "х": "x", "у": "y", "о": "o", "р": "p", "к": "k", "м": "m", "т": "t", "з": "z", "н": "n" };
  function lex(src) {
    const s = String(src).toLowerCase().replace(/[−–—]/g, "-").replace(/[·⋅•×∙*]/g, "*").replace(/:/g, "/").replace(/²/g, "^2").replace(/³/g, "^3");
    const out = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9]/.test(ch) || ((ch === "," || ch === ".") && /[0-9]/.test(s[i + 1] || ""))) {
        let j = i; while (j < s.length && /[0-9.,]/.test(s[j])) j++;
        let t = s.slice(i, j).replace(",", ".");
        if ((t.match(/\./g) || []).length > 1) throw new Error("лишняя запятая в числе");
        out.push({ t: "num", v: t }); i = j; continue;
      }
      if (/[a-z]/.test(ch) || LOOK[ch]) { out.push({ t: "var", v: LOOK[ch] || ch }); i++; continue; }
      if ("+-*/^()".includes(ch)) { out.push({ t: ch }); i++; continue; }
      throw new Error(`непонятный знак «${ch}»`);
    }
    return out;
  }
  // Возвращает { poly, info }: info — сколько скобок, слагаемых верхнего уровня и были ли подобные.
  function parse(src) {
    const tk = lex(src);
    if (!tk.length) throw new Error("пусто");
    let p = 0, parens = 0;
    const peek = () => tk[p], take = () => tk[p++];
    const startsFactor = (t) => t && (t.t === "num" || t.t === "var" || t.t === "(");
    function expr(top) {
      const terms = [];
      let sign = 1;
      if (peek() && (peek().t === "+" || peek().t === "-")) { sign = take().t === "-" ? -1 : 1; }
      let t = term(); terms.push(sign < 0 ? t.neg() : t);
      while (peek() && (peek().t === "+" || peek().t === "-")) { const op = take().t; t = term(); terms.push(op === "-" ? t.neg() : t); }
      let sum = new Poly(); for (const x of terms) sum = sum.add(x);
      if (top) top.terms = terms;
      return sum;
    }
    function term() {
      let r = factor();
      for (;;) {
        const t = peek();
        if (t && t.t === "*") { take(); r = r.mul(factor()); }
        else if (t && t.t === "/") { take(); const d = factor(); if (!d.isConst()) throw new Error("делить можно только на число"); r = r.mul(Poly.num(new Q(1).div(d.constVal()))); }
        else if (startsFactor(t)) r = r.mul(factor());
        else return r;
      }
    }
    function factor() {
      const t = peek();
      if (t && t.t === "-") { take(); return factor().neg(); }
      if (t && t.t === "+") { take(); return factor(); }
      let b = primary();
      while (peek() && peek().t === "^") { take(); const e = take(); if (!e || e.t !== "num" || !/^\d+$/.test(e.v)) throw new Error("показатель — натуральное число"); b = b.pow(Number(e.v)); }
      return b;
    }
    function primary() {
      const t = take();
      if (!t) throw new Error("выражение оборвалось");
      if (t.t === "num") return Poly.num(Q.of(t.v));
      if (t.t === "var") return Poly.vr(t.v);
      if (t.t === "(") { parens++; const e = expr(); const c = take(); if (!c || c.t !== ")") throw new Error("не закрыта скобка"); return e; }
      throw new Error(`лишний знак «${t.t}»`);
    }
    const info = {};
    const poly = expr(info);
    if (p < tk.length) throw new Error(tk[p].t === ")" ? "лишняя закрывающая скобка" : "не получилось прочитать до конца");
    // Подобные не приведены: два слагаемых верхнего уровня с одинаковой буквенной частью.
    const keys = info.terms.flatMap((t) => [...t.m.keys()]);
    info.likeLeft = new Set(keys).size !== keys.length;
    info.parens = parens;
    info.topTerms = info.terms.length;
    delete info.terms;
    return { poly, info };
  }

  // ── Вывод многочлена как в тетради ──
  // Конечная десятичная дробь — через запятую, иначе обыкновенная: 2,5 и 28/3.
  const terminates = (d) => { while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; };
  const fmtQ = (q) => (q.d === 1 ? String(Math.abs(q.n)) : terminates(q.d) ? String(Math.abs(q.val())).replace(".", ",") : `${Math.abs(q.n)}/${q.d}`);
  function show(poly, order) {
    const keys = [...poly.m.keys()];
    const rank = (k) => (order && order.includes(k) ? order.indexOf(k) : k === "" ? 1e6 : 100 + keys.indexOf(k));
    keys.sort((a, b) => rank(a) - rank(b));
    if (!keys.length) return "0";
    return keys.map((k, i) => {
      const c = poly.m.get(k);
      const negative = c.n < 0;
      const abs = fmtQ(c);
      const vars = k.split("*").filter(Boolean).map((p) => { const [v, e] = p.split("^"); return e ? `${v}<sup>${e}</sup>` : v; }).join("");
      const body = k === "" ? abs : (abs === "1" ? "" : abs) + vars;
      return (i === 0 ? (negative ? "−" : "") : negative ? " − " : " + ") + body;
    }).join("");
  }

  root.KoriAlgebra = { Q, Poly, parse, show, lex };
})(typeof window !== "undefined" ? window : globalThis);
