-- Задел базы для педагогических измерений (психометрики) тренажёров Корифея.
-- Принцип: храним сырые события без потерь, всё остальное — производные таблицы и запросы.
-- Персональных данных нет: student_ref — токен, выданный учителем; имена — только у учителя.

CREATE TABLE IF NOT EXISTS events (
  event_id        TEXT PRIMARY KEY,   -- uuid события (защита от двойной отправки)
  v               INTEGER,            -- версия формата kori-trace
  ts              INTEGER NOT NULL,   -- время на устройстве ученика, мс
  received_at     INTEGER NOT NULL,   -- время приёма сервером, мс
  type            TEXT NOT NULL,      -- session_start | item_start | attempt | hint | item_end | heartbeat | blur | focus | round_start | round_end | session_end
  session_id      TEXT,
  student_ref     TEXT NOT NULL,      -- токен ученика (псевдоним), не имя
  class_ref       TEXT,               -- код класса, например 7A-alg
  trainer         TEXT,               -- id тренажёра: math7-expressions
  trainer_version TEXT,
  item_id         TEXT,               -- конкретное задание (шаблон + параметры)
  skill           TEXT,               -- навык внутри тренажёра: like, brackets, …
  node            TEXT,               -- узел понимания Кори
  level           INTEGER,            -- уровень 1–3 (А/Б/В)
  template        TEXT,               -- шаблон задания: like.sum_br — единица калибровки
  attempt_no      INTEGER,
  correct         INTEGER,            -- 1/0 для attempt
  answer          TEXT,               -- ответ ученика как введён (≤ 80 символов)
  misconception   TEXT,               -- ID заблуждения из таблицы методиста или local
  latency_ms      INTEGER,            -- время до ответа: от показа или от прошлой попытки
  hint_level      INTEGER,
  solved          INTEGER,            -- для item_end
  attempts        INTEGER,
  hints           INTEGER,
  superscore      REAL,               -- супербалл задания 0..1 (см. docs/psychometrics.md)
  duration_ms     INTEGER,
  payload         TEXT                -- всё событие целиком (JSON) — на случай новых полей
);
CREATE INDEX IF NOT EXISTS ev_class_ts ON events(class_ref, ts);
CREATE INDEX IF NOT EXISTS ev_student ON events(student_ref, ts);
CREATE INDEX IF NOT EXISTS ev_item ON events(item_id);
CREATE INDEX IF NOT EXISTS ev_template ON events(template, type);

-- Справочник заданий: что было показано хотя бы раз.
CREATE TABLE IF NOT EXISTS items (
  item_id    TEXT PRIMARY KEY,
  trainer    TEXT,
  skill      TEXT,
  node       TEXT,
  level      INTEGER,
  template   TEXT,
  first_seen INTEGER
);

-- Посильность шаблона (Аббакумов: доля успеха с учётом попыток и подсказок) — средний супербалл.
CREATE VIEW IF NOT EXISTS template_feasibility AS
  SELECT trainer, template, skill, level, COUNT(*) AS n_items, COUNT(DISTINCT student_ref) AS n_students,
         AVG(superscore) AS feasibility
  FROM events WHERE type = 'item_end' AND template IS NOT NULL
  GROUP BY trainer, template;

-- Успеваемость ученика по тренажёру и навыку — средний супербалл.
CREATE VIEW IF NOT EXISTS student_performance AS
  SELECT class_ref, student_ref, trainer, skill, COUNT(*) AS n_items, AVG(superscore) AS performance
  FROM events WHERE type = 'item_end'
  GROUP BY class_ref, student_ref, trainer, skill;

-- Частоты заблуждений: сколько учеников хотя бы раз (для отчётов наружу — только от 3 учеников).
CREATE VIEW IF NOT EXISTS misconception_freq AS
  SELECT class_ref, trainer, node, misconception, COUNT(DISTINCT student_ref) AS n_students, COUNT(*) AS n_attempts
  FROM events WHERE type = 'attempt' AND misconception IS NOT NULL
  GROUP BY class_ref, trainer, node, misconception;
