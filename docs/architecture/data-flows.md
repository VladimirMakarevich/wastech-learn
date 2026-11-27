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
  M->>L: mdlint + check с наложением
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
  A->>S: GET /api/status, /api/bundle, /api/events
  S->>R: чтение content и reviews/**
  S-->>A: статус, bundle (ETag) и журнал
  A->>A: session: replay → очередь srs
  loop каждая карточка
    A->>A: вопрос → уверенность → ответ → оценка
    A->>A: replay одного review item, следующая карточка
    A->>S: POST /api/events [review]
    S->>R: append reviews/desk1/web-2026-11.jsonl
    S-->>A: { appended, duplicates }
  end
```

Сервер принимает только события `writer: web` своего устройства, каждое через схему `core`; повтор `id` пропускается. Запрос с чужим `Host` или `Origin`, не JSON или тело больше 256 KB отклоняются (`403`, `415`, `413`), CORS-заголовков нет. Пока сервер недоступен, события ждут в `ReviewStore` приложения и досылаются позже.

## Квиз в чате (J-09)

Последовательность описана в [tutor-and-grading.md](../ai/tutor-and-grading.md#квиз-в-чате-learn-quiz). MCP-сервер сам делает replay журнала в памяти, `record_review` пишет в файл writer `mcp`.

## Изменение файлов и пересборка

```mermaid
sequenceDiagram
  participant V as VS Code / git pull
  participant S as Local server (watchRepository)
  participant A as App
  V->>S: изменились content/**, reviews/** или learn.config.json
  S->>S: тишина 200 мс; своя дозапись не в счёт
  alt content или config
    S->>S: полная сборка bundle
    S-->>A: SSE content-changed или build-failed (находки)
    A->>S: GET /api/bundle
  else reviews
    S-->>A: SSE events-changed
    A->>S: GET /api/events, полный replay в клиенте
  end
  S-->>A: SSE git-changed (на любое изменение рабочего дерева)
  A->>S: GET /api/git
```

При `build-failed` сервер отдаёт последний собранный bundle, а приложение показывает баннер с файлом и строкой.

## Синхронизация между компьютерами (J-08)

```mermaid
sequenceDiagram
  participant D1 as desk1
  participant G as git remote
  participant D2 as laptop
  D1->>G: push (reviews/desk1/*)
  D2->>G: pull
  G-->>D2: новые строки в reviews/desk1/*
  D2->>D2: replay всех журналов
  D2->>G: push (reviews/laptop/*)
```

Конфликтов нет: каждое устройство и каждый writer пишут только в свой файл ([sync.md](sync.md)). В приложении оба шага — кнопки панели синхронизации: «Синхронизировать» (`POST /api/git/sync`: commit путей синхронизации, `pull --rebase` с autostash, push) и «Получить» (`POST /api/git/pull`). Обе идут через ту же очередь сервера, что запись контента и дозапись журнала; после операции сервер шлёт `git-changed`, а наблюдатель — `content-changed` и `events-changed` для полученных файлов.

## Импорт learning package (J-02)

1. Пользователь кладёт файл в `inbox/`.
2. `learn-import` вызывает `import_package`. Тот разбирает пакет через схему `core` и возвращает тему и кандидатов.
3. Дальше всё как при захвате: отбор, `add_cards`, `save_summary` (в существующую тему — с `merge`), `save_diagram`, валидация.
4. `archive_package` переносит исходник в `inbox/done/`.

## См. также

- [Компоненты](components.md) · [MCP-инструменты](../ai/mcp-tools.md)
