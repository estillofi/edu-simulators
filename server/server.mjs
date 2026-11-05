// Сервер класса — прототип для одного компьютера учителя (MVP перед передачей в LMS Кори).
// node server/server.mjs [--port 8787]
//   • отдаёт тренажёры из корня репозитория;
//   • принимает события kori-trace: POST /api/events → SQLite (server/data/kori.db);
//   • считает три сигнала учителя и педагогические измерения: GET /api/class?c=7A;
//   • шлёт табло обновления вживую: GET /api/stream?c=7A (Server-Sent Events).
// Имён учеников сервер не знает: только токены. Список «токен → имя» живёт в браузере учителя.
import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { classState, analytics } from "./signals.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PORT = Number(process.argv[process.argv.indexOf("--port") + 1]) || 8787;
await mkdir(join(HERE, "data"), { recursive: true });
const db = new DatabaseSync(join(HERE, "data", "kori.db"));
db.exec(await readFile(join(HERE, "schema.sql"), "utf8"));

const insert = db.prepare(`INSERT OR IGNORE INTO events
  (event_id, v, ts, received_at, type, session_id, student_ref, class_ref, trainer, trainer_version,
   item_id, skill, node, level, template, attempt_no, correct, answer, misconception, latency_ms,
   hint_level, solved, attempts, hints, superscore, duration_ms, payload)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const upsertItem = db.prepare(`INSERT INTO items (item_id, trainer, skill, node, level, template, first_seen)
  VALUES (?,?,?,?,?,?,?) ON CONFLICT(item_id) DO NOTHING`);
const b = (x) => (x === undefined || x === null ? null : x ? 1 : 0);
const n = (x) => (x === undefined ? null : x);

function store(events) {
  const now = Date.now();
  const classes = new Set();
  db.exec("BEGIN");
  try {
    for (const e of events) {
      if (!e || !e.event_id || !e.type || !e.student_ref) continue;
      insert.run(e.event_id, n(e.v), n(e.ts), now, e.type, n(e.session_id), String(e.student_ref).slice(0, 64), n(e.class_ref), n(e.trainer), n(e.trainer_version),
        n(e.item_id), n(e.skill), n(e.node), n(e.level), n(e.template), n(e.attempt_no), b(e.correct), e.answer === undefined ? null : String(e.answer).slice(0, 80),
        n(e.misconception), n(e.latency_ms), n(e.hint_level), b(e.solved), n(e.attempts), n(e.hints), n(e.superscore), n(e.duration_ms), JSON.stringify(e).slice(0, 4000));
      if (e.item_id && e.type === "item_start") upsertItem.run(e.item_id, n(e.trainer), n(e.skill), n(e.node), n(e.level), n(e.template), now);
      if (e.class_ref) classes.add(e.class_ref);
    }
    db.exec("COMMIT");
  } catch (err) { db.exec("ROLLBACK"); throw err; }
  classes.forEach(push);
}

// ── Живой эфир ──
const subs = new Map(); // класс → Set(res)
function push(c) {
  const set = subs.get(c);
  if (!set) return;
  const data = `event: update\ndata: ${JSON.stringify({ c, t: Date.now() })}\n\n`;
  for (const res of set) res.write(data);
}
setInterval(() => { for (const [c, set] of subs) for (const res of set) res.write(`event: tick\ndata: ${Date.now()}\n\n`); }, 5000);

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".csv": "text/csv; charset=utf-8" };
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }); res.end(JSON.stringify(obj)); };
const windowMs = (url) => (Number(url.searchParams.get("hours")) || 3) * 3600e3;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  try {
    if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST" }); return res.end(); }
    if (p === "/api/ping") return json(res, 200, { kori: true, v: 1 });
    if (p === "/api/events" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) { body += chunk; if (body.length > 2e6) throw new Error("слишком большой пакет"); }
      const events = JSON.parse(body || "[]");
      store(Array.isArray(events) ? events : [events]);
      return json(res, 200, { ok: true, n: Array.isArray(events) ? events.length : 1 });
    }
    if (p === "/api/classes") {
      const rows = db.prepare(`SELECT class_ref AS c, COUNT(DISTINCT student_ref) AS students, MAX(ts) AS last FROM events WHERE class_ref IS NOT NULL GROUP BY class_ref ORDER BY last DESC`).all();
      return json(res, 200, rows);
    }
    if (p === "/api/class") {
      const c = url.searchParams.get("c");
      const since = Date.now() - windowMs(url);
      const rows = db.prepare(`SELECT * FROM events WHERE class_ref = ? AND ts >= ? ORDER BY ts`).all(c, since);
      return json(res, 200, classState(rows, Date.now()));
    }
    if (p === "/api/analytics") {
      const c = url.searchParams.get("c");
      const rows = c ? db.prepare(`SELECT * FROM events WHERE class_ref = ? AND type = 'item_end' ORDER BY ts`).all(c) : db.prepare(`SELECT * FROM events WHERE type = 'item_end' ORDER BY ts`).all();
      return json(res, 200, analytics(rows));
    }
    if (p === "/api/export") {
      const c = url.searchParams.get("c");
      const rows = db.prepare(`SELECT event_id, ts, type, session_id, student_ref, class_ref, trainer, item_id, skill, node, level, template, attempt_no, correct, answer, misconception, latency_ms, hint_level, solved, attempts, hints, superscore, duration_ms FROM events WHERE class_ref = ? ORDER BY ts`).all(c);
      const cols = rows.length ? Object.keys(rows[0]) : ["event_id"];
      const esc = (v) => (v === null ? "" : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
      res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kori-events-${c}.csv"` });
      return res.end("﻿" + [cols.join(","), ...rows.map((r) => cols.map((k) => esc(r[k])).join(","))].join("\n"));
    }
    if (p === "/api/stream") {
      const c = url.searchParams.get("c");
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
      res.write(`event: hello\ndata: ${Date.now()}\n\n`);
      if (!subs.has(c)) subs.set(c, new Set());
      subs.get(c).add(res);
      req.on("close", () => subs.get(c)?.delete(res));
      return;
    }
    // Статика
    let file = normalize(join(ROOT, decodeURIComponent(p)));
    if (!file.startsWith(ROOT) || file.includes(`${join(ROOT, "server", "data")}`)) { res.writeHead(403); return res.end("нет доступа"); }
    if (p.endsWith("/") || (existsSync(file) && !extname(file))) file = join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "EISDIR" || err.code === "ENOTDIR") { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Не найдено"); }
    json(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  console.log(`Сервер класса Кори запущен.`);
  console.log(`  Табло учителя:   http://localhost:${PORT}/teacher/`);
  console.log(`  Ссылки ученикам: http://localhost:${PORT}/teacher/tokens.html`);
  ips.forEach((ip) => console.log(`  В локальной сети: http://${ip}:${PORT}/`));
  console.log(`  База: server/data/kori.db`);
});
