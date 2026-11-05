// kori-trace — единый журнал учебных событий тренажёров Корифея.
// Один формат для всех тренажёров: из него учитель видит класс вживую, а аналитика
// считает педагогические измерения (супербалл, успеваемость, посильность).
//
// Кто ученик: ссылка учителя ?c=<класс>&s=<токен>. Имён здесь нет — только токен;
// список «токен → имя» хранится у учителя. Без токена ученик анонимный.
// Куда шлём: на тот же сервер, что отдал страницу (/api/events), или на ?srv=<адрес>.
// Сервера нет (GitHub Pages, файл) — события копятся только в этом браузере.
(function (root) {
  "use strict";
  const V = 1;
  const QKEY = "kori-trace-queue";
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.slice(1));
  const pick = (k) => params.get(k) || hashParams.get(k);

  // Супербалл задания: 1 — с первой попытки без подсказок, 0 — не решено.
  // Штрафы за попытку и подсказку — параметры аналитика (гипотеза, калибруются на данных).
  const SCORE = { attemptPenalty: 0.25, hintPenalty: 0.25 };
  const superscore = (solved, attempts, hints) => (solved ? Math.max(0, 1 - SCORE.attemptPenalty * Math.max(0, attempts - 1) - SCORE.hintPenalty * hints) : 0);

  const state = {
    ready: false, trainer: null, version: null,
    student_ref: null, class_ref: null, session_id: uid(),
    server: null, queue: store.get(QKEY, []), listeners: [], log: [],
    lastInput: Date.now(),
  };

  function identity() {
    let s = pick("s"), c = pick("c");
    if (s) store.set("kori-trace-id", { s, c }); else ({ s, c } = store.get("kori-trace-id", {}));
    if (!s) { s = store.get("kori-trace-anon", null) || `anon-${uid().slice(0, 8)}`; store.set("kori-trace-anon", s); }
    state.student_ref = s;
    state.class_ref = c || null;
  }

  async function findServer() {
    const explicit = pick("srv");
    // На GitHub Pages сервера класса нет — не стучимся зря.
    const base = explicit ? explicit.replace(/\/$/, "") : location.protocol.startsWith("http") && !location.hostname.endsWith("github.io") ? location.origin : null;
    if (!base) return null;
    try {
      const r = await fetch(`${base}/api/ping`, { cache: "no-store" });
      if (r.ok && (await r.json()).kori) return base;
    } catch (_) {}
    return null;
  }

  function emit(type, data = {}) {
    const e = {
      v: V, event_id: uid(), ts: Date.now(), type,
      session_id: state.session_id, student_ref: state.student_ref, class_ref: state.class_ref,
      trainer: state.trainer, trainer_version: state.version, ...data,
    };
    state.log.push(e);
    state.queue.push(e);
    if (state.queue.length > 800) state.queue.splice(0, state.queue.length - 800);
    store.set(QKEY, state.queue);
    state.listeners.forEach((f) => { try { f(e); } catch (_) {} });
    return e;
  }

  let flushing = false;
  async function flush(beacon = false) {
    if (!state.server || !state.queue.length || flushing) return;
    const batch = state.queue.slice(0, 100);
    const url = `${state.server}/api/events`;
    if (beacon && navigator.sendBeacon) { if (navigator.sendBeacon(url, new Blob([JSON.stringify(batch)], { type: "application/json" }))) drop(batch.length); return; }
    flushing = true;
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch), keepalive: true });
      if (r.ok) drop(batch.length);
    } catch (_) {} finally { flushing = false; }
  }
  function drop(n) { state.queue.splice(0, n); store.set(QKEY, state.queue); }

  // Задание: от показа до конца. Время ответа — от показа или от прошлой попытки.
  function item(meta) {
    const t0 = Date.now();
    let last = t0, attempts = 0, hints = 0, solved = false, closed = false;
    const base = { item_id: meta.item_id, skill: meta.skill || null, node: meta.node || null, level: meta.level ?? null, template: meta.template || null };
    emit("item_start", base);
    return {
      attempt({ correct, answer = "", misconception = null }) {
        if (closed) return;
        attempts++;
        const now = Date.now();
        emit("attempt", { ...base, attempt_no: attempts, correct: !!correct, answer: String(answer).slice(0, 80), misconception, latency_ms: now - last, hints_so_far: hints });
        last = now;
        if (correct) solved = true;
      },
      hint(level) { if (closed) return; hints++; emit("hint", { ...base, hint_level: level ?? hints, latency_ms: Date.now() - t0 }); },
      end(extra = {}) {
        if (closed) return null;
        closed = true;
        const s = superscore(solved, attempts, hints);
        emit("item_end", { ...base, solved, attempts, hints, superscore: s, duration_ms: Date.now() - t0, ...extra });
        flush();
        return s;
      },
      get attempts() { return attempts; }, get hints() { return hints; },
    };
  }

  async function init({ trainer, version = "1" }) {
    state.trainer = trainer; state.version = String(version);
    identity();
    state.server = await findServer();
    emit("session_start", { ua_mobile: /Mobi|Android/i.test(navigator.userAgent), screen_w: innerWidth });
    state.ready = true;
    setInterval(() => flush(), 2000);
    // Пульс: учитель видит, что ученик на месте, и сколько он молчит.
    setInterval(() => { if (document.visibilityState === "visible") emit("heartbeat", { idle_ms: Date.now() - state.lastInput }); }, 15000);
    ["keydown", "pointerdown"].forEach((ev) => addEventListener(ev, () => (state.lastInput = Date.now()), { passive: true }));
    addEventListener("visibilitychange", () => { emit(document.visibilityState === "hidden" ? "blur" : "focus"); if (document.visibilityState === "hidden") flush(true); });
    addEventListener("pagehide", () => { emit("session_end"); flush(true); });
    flush();
    return api;
  }

  const api = {
    init, item, emit, superscore, SCORE,
    on(f) { state.listeners.push(f); },
    get student() { return state.student_ref; },
    get klass() { return state.class_ref; },
    get online() { return !!state.server; },
    get log() { return state.log; },
  };
  root.KoriTrace = api;
})(window);
