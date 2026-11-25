# Потоки данных

Sequence-диаграммы ключевых потоков фазы 1. Участники описаны в [обзоре](overview.md) и [компонентах](components.md).

## Захват темы в Claude Code (J-01)

```mermaid
sequenceDiagram
  participant U as Пользователь
  participant CC as Claude Code + learn-capture
  participant M as wastech-learn-mcp
  participant L as mdlint core + check
  participant R as content repo
  U->>CC: «разберём backpressure»
  CC->>M: search(«backpressure»)
  M-->>CC: похожих тем нет
  CC->>U: pre-questions, диалог, brain dump
  CC->>M: add_cards(dryRun=true, кандидаты)
  M->>L: lintContent + check
  L-->>M: находки
  M-->>CC: кандидаты + находки
  CC->>U: кандидаты на отбор
  U-->>CC: выбранные и правки
  CC->>M: create_topic, add_cards, save_summary, save_diagram
  M->>L: валидация
  M->>R: запись файлов (index, summary, cards, diagrams)
  CC->>M: quiz_next(3) → reveal → record_review
  M->>R: reviews/desk1/mcp-2026-11.jsonl (append)
```

## Повторение в приложении (J-03)

```mermaid
sequenceDiagram
  participant A as App (браузер)
  participant S as Local server
  participant R as content repo
  A->>S: GET /bundle, GET /events
  S->>R: чтение content и reviews/**
  S-->>A: bundle + журнал
  A->>A: srs.replay → очередь
  loop каждая карточка
    A->>A: вопрос → уверенность → ответ → оценка
    A->>S: POST /events [review]
    S->>R: append reviews/desk1/web-2026-11.jsonl
    S-->>A: ok (идемпотентно по event.id)
  end
```

## Квиз в чате (J-09)

Последовательность описана в [tutor-and-grading.md](../ai/tutor-and-grading.md#квиз-в-чате-learn-quiz). MCP-сервер сам делает replay из журнала и кэша, `record_review` пишет в файл writer `mcp`.

## Изменение файлов и пересборка

```mermaid
sequenceDiagram
  participant V as VS Code / git pull
  participant S as Local server (watch)
  participant A as App
  V->>S: изменились content/** или reviews/**
  S->>S: инкрементальная сборка bundle и replay
  S-->>A: SSE «content-changed» / «events-changed»
  A->>S: GET /bundle или /events
```

## Синхронизация между компьютерами (J-08)

```mermaid
sequenceDiagram
  participant D1 as desk1
  participant G as git remote
  participant D2 as laptop
  D1->>G: push (reviews/desk1/*)
  D2->>G: pull
  G-->>D2: новые строки в reviews/desk1/*
  D2->>D2: replay всех журналов → кэш
  D2->>G: push (reviews/laptop/*)
```

Конфликтов нет: каждое устройство и каждый writer пишут только в свой файл ([sync.md](sync.md)).

## Импорт learning package (J-02)

1. Пользователь кладёт файл в `inbox/`.
2. `learn-import` вызывает `import_package`. Тот разбирает пакет через схему `core` и возвращает тему и кандидатов.
3. Дальше всё как при захвате: отбор, `add_cards`, `save_summary`, `save_diagram`, валидация.
4. Исходник перемещается в `inbox/done/`.

## См. также

- [Компоненты](components.md) · [MCP-инструменты](../ai/mcp-tools.md)
