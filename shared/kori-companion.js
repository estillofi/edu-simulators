// kori-companion — Кори на странице тренажёра. Ненавязчиво: угол экрана, говорит только
// подсказками, на верный ответ меняет позу без слов, на ошибку не реагирует.
// Позы — стикеры из shared/kori/. Движение — CSS; при «уменьшить движение» его нет.
(function (root) {
  "use strict";
  const POSES = {
    idle: "delovoy", think: "hmm", hint: "idea", welcome: "wow2",
    correct: "welldone", wow: "wow", streak: "cup", level: "ura", work: "circul",
  };
  const CSS = `
.kc{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:50;display:flex;align-items:flex-end;gap:8px;pointer-events:none;font-family:var(--font,system-ui,sans-serif)}
.kc-body{position:relative;width:var(--kc-size,104px);height:var(--kc-size,104px);pointer-events:auto;cursor:pointer;border:0;padding:0;background:transparent}
.kc-body img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .25s ease;transform-origin:50% 92%}
.kc-body img.out{opacity:0}
.kc-body .kc-shadow{position:absolute;left:18%;right:18%;bottom:2%;height:8%;border-radius:50%;background:rgba(27,58,82,.18);filter:blur(3px);transition:transform .3s}
.kc[data-anim="breathe"] img.in{animation:kc-breathe 4.2s ease-in-out infinite}
.kc[data-anim="hop"] img.in{animation:kc-hop .7s cubic-bezier(.3,.7,.3,1)}
.kc[data-anim="hop"] .kc-shadow{animation:kc-shadow .7s cubic-bezier(.3,.7,.3,1)}
.kc[data-anim="wave"] img.in{animation:kc-wave 1.4s ease-in-out}
.kc[data-anim="tilt"] img.in{animation:kc-tilt .9s ease-in-out}
.kc[data-anim="cheer"] img.in{animation:kc-cheer 1.1s cubic-bezier(.3,.7,.3,1)}
@keyframes kc-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,1.03)}}
@keyframes kc-hop{0%{transform:translateY(0) scale(1,1)}20%{transform:translateY(0) scale(1.08,.9)}50%{transform:translateY(-16%) scale(.95,1.06)}80%{transform:translateY(0) scale(1.05,.95)}100%{transform:none}}
@keyframes kc-shadow{50%{transform:scale(.7);opacity:.6}}
@keyframes kc-wave{0%,100%{transform:rotate(0)}20%{transform:rotate(-7deg)}40%{transform:rotate(6deg)}60%{transform:rotate(-5deg)}80%{transform:rotate(3deg)}}
@keyframes kc-tilt{0%,100%{transform:rotate(0)}40%{transform:rotate(-5deg) translateY(-3%)}}
@keyframes kc-cheer{0%{transform:scale(.9)}35%{transform:translateY(-12%) scale(1.06)}65%{transform:translateY(0) scale(.98)}100%{transform:none}}
.kc-bubble{pointer-events:auto;max-width:min(320px,62vw);background:var(--card,#fff);color:var(--ink,#1B3A52);border-radius:20px 20px 4px 20px;padding:12px 14px 12px 14px;box-shadow:0 0 0 1.5px var(--teal,#00A3B9),0 10px 30px -14px rgba(27,58,82,.35);font-size:15px;line-height:1.45;margin-bottom:calc(var(--kc-size,104px) * .45);opacity:0;transform:translateY(6px) scale(.98);transition:opacity .25s,transform .25s;position:relative}
.kc-bubble.show{opacity:1;transform:none}
.kc-bubble b.kc-t{display:block;color:var(--teal-ink,#007F91);font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:2px}
.kc-bubble .kc-x{position:absolute;top:4px;right:6px;border:0;background:transparent;color:var(--muted,#8E9FAB);font-size:16px;cursor:pointer;line-height:1;padding:2px 4px}
.kc-mute{pointer-events:auto;align-self:flex-end;border:0;border-radius:32px;background:var(--card,#fff);color:var(--muted,#8E9FAB);font:600 12px var(--font,system-ui);padding:5px 10px;box-shadow:0 0 0 1px var(--line,#E0E4E8);cursor:pointer;margin-bottom:4px}
.kc[data-quiet] .kc-body{--kc-size:56px;width:56px;height:56px;opacity:.85}
.kc[data-quiet] .kc-bubble{display:none}
@media (max-width:640px){.kc{--kc-size:76px}.kc-bubble{font-size:14px}}
@media (prefers-reduced-motion:reduce){.kc img.in,.kc .kc-shadow{animation:none!important}.kc-bubble{transition:none}}
.kc :focus-visible{outline:2px solid var(--orange,#FF5B00);outline-offset:2px}
`;
  const state = { el: null, imgs: [], cur: 0, base: "", timer: 0, animTimer: 0, quiet: false, pose: "idle" };
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };

  function mount({ base = "../../shared/kori/", quiet } = {}) {
    state.base = base.replace(/\/?$/, "/");
    const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    const el = document.createElement("div");
    el.className = "kc"; el.setAttribute("aria-live", "polite");
    el.innerHTML = `<div class="kc-bubble" role="status"><button class="kc-x" type="button" aria-label="Закрыть">×</button><div class="kc-text"></div></div>
      <div style="display:grid;justify-items:end;gap:2px"><button class="kc-mute" type="button"></button>
      <button class="kc-body" type="button" aria-label="Кори"><span class="kc-shadow"></span><img alt="" class="in"><img alt="" class="out"></button></div>`;
    document.body.appendChild(el);
    state.el = el;
    state.imgs = [...el.querySelectorAll(".kc-body img")];
    Object.values(POSES).forEach((p) => { const i = new Image(); i.src = `${state.base}${p}.webp`; });
    state.imgs[0].src = `${state.base}${POSES.idle}.webp`;
    el.querySelector(".kc-x").addEventListener("click", hideBubble);
    el.querySelector(".kc-mute").addEventListener("click", () => setQuiet(!state.quiet));
    el.querySelector(".kc-body").addEventListener("click", () => { if (state.quiet) setQuiet(false); else anim("tilt", 900); });
    setQuiet(quiet ?? store.get("kori-quiet", false), true);
    anim("breathe");
    return api;
  }

  function setQuiet(q, silent) {
    state.quiet = q; store.set("kori-quiet", q);
    state.el.toggleAttribute("data-quiet", q);
    state.el.querySelector(".kc-mute").textContent = q ? "Кори, вернись" : "Тише";
    if (q) hideBubble();
    if (!silent) api.onQuiet?.(q);
  }
  function pose(name, ms) {
    const file = POSES[name] || name;
    const [a, b] = state.cur === 0 ? state.imgs : [state.imgs[1], state.imgs[0]];
    if (a.src.endsWith(`${file}.webp`)) { if (ms) back(ms); return; }
    b.src = `${state.base}${file}.webp`;
    b.className = "in"; a.className = "out";
    state.cur = 1 - state.cur;
    state.pose = name;
    if (ms) back(ms);
  }
  function back(ms) { clearTimeout(state.poseTimer); state.poseTimer = setTimeout(() => { pose("idle"); anim("breathe"); }, ms); }
  function anim(name, ms) {
    state.el.dataset.anim = "";
    void state.el.offsetWidth;
    state.el.dataset.anim = name;
    clearTimeout(state.animTimer);
    if (ms) state.animTimer = setTimeout(() => (state.el.dataset.anim = "breathe"), ms);
  }
  function say(html, { title = "", ms = 7000 } = {}) {
    if (state.quiet) return;
    const b = state.el.querySelector(".kc-bubble");
    b.querySelector(".kc-text").innerHTML = `${title ? `<b class="kc-t">${title}</b>` : ""}${html}`;
    b.classList.add("show");
    clearTimeout(state.timer);
    if (ms) state.timer = setTimeout(hideBubble, ms);
  }
  function hideBubble() {
    state.el?.querySelector(".kc-bubble").classList.remove("show");
    if (state.pose === "hint") { pose("idle"); anim("breathe"); } // подсказка ушла — Кори снова спокоен
  }

  const api = {
    mount, pose, say, hide: hideBubble, setQuiet,
    get quiet() { return state.quiet; },
    welcome(text) { pose("welcome", 3200); anim("wave", 1400); if (text) say(text, { ms: 5000 }); },
    thinking() { pose("think"); anim("breathe"); },
    // Подсказка висит, пока ученик её не закроет или не проверит ответ; Кори всё это время с лампочкой.
    hint(html, title = "Подсказка") { clearTimeout(state.poseTimer); pose("hint"); anim("tilt", 900); say(html, { title, ms: 0 }); },
    // Верно: без слов. Обычный — кивок; серия — кубок; трудное с первой попытки — «вау»; новый уровень — «ура».
    correct({ streak = 0, hard = false, levelUp = false } = {}) {
      hideBubble();
      if (levelUp) { pose("level", 2400); anim("cheer", 1100); }
      else if (streak > 0 && streak % 5 === 0) { pose("streak", 2400); anim("cheer", 1100); }
      else if (hard) { pose("wow", 1800); anim("hop", 700); }
      else { pose("correct", 1400); anim("hop", 700); }
    },
    wrong() { hideBubble(); }, // по решению владельца: на ошибку Кори не реагирует
  };
  root.KoriCompanion = api;
})(window);
