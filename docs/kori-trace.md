# kori-trace v1 — формат учебных событий

Один формат для всех тренажёров. Клиент — `shared/kori-trace.js`, приём — `POST /api/events` (массив событий JSON).

## Подключение в тренажёре

```html
<script src="../../shared/kori-trace.js"></script>
<script>
  KoriTrace.init({ trainer: "math7-expressions", version: "1" });
  const it = KoriTrace.item({ item_id, skill, node, level, template }); // показали задание
  it.attempt({ correct, answer, misconception });                        // каждая проверка
  it.hint(level);                                                         // каждая подсказка
  it.end({ result });                                                     // задание закрыто → супербалл
</script>
```

Ученик определяется ссылкой учителя `?c=<класс>&s=<токен>`. Без токена — анонимный `anon-…` (данные есть, на табло класса не попадает). События уходят на сервер, который отдал страницу, или на `?srv=<адрес>`. Сервера нет (GitHub Pages) — очередь копится в `localStorage` этого браузера.

## Общие поля

| Поле | Тип | Смысл |
|---|---|---|
| `v` | int | версия формата, сейчас 1 |
| `event_id` | uuid | уникален; сервер отбрасывает повтор |
| `ts` | мс | время на устройстве ученика |
| `type` | строка | см. ниже |
| `session_id` | uuid | одно открытие страницы |
| `student_ref` | строка | токен ученика, не имя |
| `class_ref` | строка | код класса |
| `trainer`, `trainer_version` | строка | id тренажёра и версия |

## Типы

| type | Доп. поля |
|---|---|
| `session_start` | `ua_mobile`, `screen_w` |
| `item_start` | `item_id`, `skill`, `node`, `level` (1–3), `template` |
| `attempt` | + `attempt_no`, `correct`, `answer` (≤ 80), `misconception` (ID или null), `latency_ms`, `hints_so_far` |
| `hint` | + `hint_level`, `latency_ms` (от показа задания) |
| `item_end` | + `solved`, `attempts`, `hints`, `superscore` (0..1), `duration_ms`, `result` (ok / help / miss) |
| `round_start`, `round_end` | `skill`, `level_mode` / `results`, `level` |
| `heartbeat` | `idle_ms` — сколько ученик ничего не вводит; каждые 15 с, пока вкладка видна |
| `blur`, `focus`, `session_end` | — |

## Правила

- Попытка — только проверенный ответ. Недописанный (скобки не раскрыты, подобные не приведены) или нечитаемый ввод — не попытка и не штраф.
- `misconception` — ID из таблицы методиста (`minus_only_first`) или локальный код тренажёра; список кодов — в самом тренажёре (`CODES`).
- `item_id` = шаблон + параметры; `template` — единица калибровки трудности.
- Супербалл считает клиент по формуле из `docs/psychometrics.md`; сервер может пересчитать из `attempts` и `hints`.
