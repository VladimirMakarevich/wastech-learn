# MCP-сервер `wastech-learn-mcp`

Тонкий хост над ядром: в нём нет своей логики, только вызовы `core`, `srs` и `content-fs` ([components](../architecture/components.md)). В MVP транспорт — stdio для Claude Code, позже тот же набор инструментов будет доступен по HTTPS (remote MCP). Сервер работает с одним контент-репозиторием, путь которого передаётся аргументом `--content`.

## Принципы

- **Идемпотентность.** Клиенты MCP повторяют вызовы, поэтому каждый мутирующий инструмент принимает `requestId`. Повторный вызов с тем же `requestId` возвращает прежний результат и ничего не пишет второй раз.
- **Сначала валидация.** Любая запись проходит mdlint (`lintContent` из `@wastech-mdlint/core`) и `check`. При ошибках ничего не пишется, а в ответе приходят находки.
- **`dryRun`.** У мутирующих инструментов есть сухой прогон: валидация и предпросмотр путей без записи.
- **Короткие ответы.** Возвращаются пути, id и находки, а не полные тексты файлов. Так экономится лимит подписки.
- **Только внутри `--content`.** Пути за пределами контент-репозитория отклоняются.

## Инструменты контента

| Инструмент | Вход | Выход | Побочные эффекты | Фаза |
| --- | --- | --- | --- | --- |
| `create_topic` | `domain`, `topic`, `title`, `lang`, `familiarity`, `keyIdea`, `pretest[]`, `tags[]`, `related[]` | путь, находки | Создаёт папку и `index.md` | MVP |
| `add_cards` | `topic`, `cards[]` (`type`, `bloom`, `grading`, `idea`, `question`, `answer`, `rubric?`, `explanation?`, `sources[]`, `status`), `dryRun` | `id[]`, пути, находки | Создаёт `cards/<id>.md`, обновляет `## Cards` в `index.md` | MVP |
| `update_card` | `id`, поля, `meaningChanged: bool` | путь, находки | Правит файл. При `meaningChanged` старая карточка уходит в `retired`, создаётся новая | MVP |
| `save_summary` | `topic`, секции по шаблону | путь, находки | Создаёт или переписывает `summary.md` | MVP |
| `save_materials` | `topic`, `items[]` (`title`, `url`, `kind`, `why`, `status`) | путь, находки | Создаёт или дополняет `materials.md` | MVP |
| `save_diagram` | `topic`, `name`, `format: mermaid`, `source`, `alt` | пути `.mmd`/`.svg` | Рендерит SVG (mermaid-cli), вписывает `source-sha256` | MVP |
| `validate` | `paths[]` или `content` (черновик) | находки mdlint + `check` | — | MVP |
| `search` | `query`, `domain?`, `type?`, `status?`, `limit` | темы и карточки (id, заголовок, путь, сниппет) | — | MVP |
| `import_package` | путь в `inbox/` | разобранный пакет: тема, кандидаты | — (запись идёт через инструменты выше) | MVP |

## Инструменты повторения

| Инструмент | Вход | Выход | Побочные эффекты | Фаза |
| --- | --- | --- | --- | --- |
| `queue_status` | — | due, бэклог, оценка в минутах, пауза новых | — | MVP |
| `quiz_next` | `limit` (≤10), `scope?` (domain, topic, tag), `mode: review \| practice` | review items: вопрос, тип, рубрика, `id`; ответ не возвращается | — | MVP |
| `reveal` | `item` | ответ, рубрика, объяснение, `contentHash` | — | MVP |
| `record_review` | `item`, `rating`, `aiSuggested?`, `confidence?`, `durMs?`, `requestId` | следующий due, интервал | Дописывает событие в `reviews/<device>/mcp-YYYY-MM.jsonl` | MVP |
| `undo_last` | `requestId` | отменённое событие | Пишет `undo` | MVP |
| `suspend` / `unsuspend` | `item` | — | Пишет событие | Later |

`quiz_next` и `reveal` разделены специально: ИИ не видит ответ, пока пользователь не попытался ответить. Это защищает от подсказок раньше времени (LP-15).

## Ресурсы и промпты MCP (Later)

- Ресурсы: `learn://topic/<domain>/<topic>/summary`, `learn://stats` — для чтения без вызова инструментов.
- Промпты: `capture`, `quiz` — те же сценарии для клиентов без поддержки skills.

## MCP Apps (Later)

Расширение MCP Apps (с 2026-01) позволяет показывать интерфейс в чате: карточку с кнопками Again, Hard, Good, Easy и шкалой уверенности. Его поддерживают Claude, ChatGPT и VS Code. Хорошо подходит для мобильного квиза через remote MCP.

## Безопасность

- В MVP нет сети: stdio, локальные файлы.
- Remote-режим (Later): OAuth и Cloudflare Access. Запись в git — через ветку или PR, а не прямо в `main`.
- Инструменты не выполняют пользовательский код и не открывают внешние URL.

## См. также

- [Захват](capture.md) · [Тьютор и оценка](tutor-and-grading.md) · [Потоки данных](../architecture/data-flows.md)
