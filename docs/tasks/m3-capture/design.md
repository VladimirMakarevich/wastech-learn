# Дизайн — M3, захват

[⌂ index](index.md) · требования — [requirements.md](requirements.md) · ядро — [дизайн M2](../m2-core/design.md)

## Обзор

Новый тонкий хост `packages/mcp-server` над пакетами M2. Логика записи — в `core` (сериализация файлов, схемы входов, поиск) и `content-fs` (проверка с наложением, транзакция, журнал, идемпотентность). Skills и шаблоны — в `skills/` фреймворка, ставятся в контент через `npx skills`. Hook — подкоманда CLI.

## Ключевые решения

| # | Решение | Почему | Отвергнуто |
| --- | --- | --- | --- |
| D1 | Схемы входов инструментов — Zod в `core/src/schema/mcp/`; сервер только регистрирует их в SDK | Правило проекта: вход разбирается схемой `core` один раз на границе | Схемы в `mcp-server` |
| D2 | Текст файлов из полей (карточка, `index.md`, summary, materials) строит `core/src/serialize/`, чистыми функциями | Тот же код понадобится серверу M4 и тестам; разбор и сериализация проверяются туда-обратно | Шаблонные строки в хосте |
| D3 | Проверка «с наложением»: новые файлы накладываются на карту репозитория, по ней идут `lintContent` и `check` | Уникальность `id`, ссылки на summary и `## Cards` видны только на всём репозитории | Проверка нового файла в отрыве |
| D4 | Транзакция записи в `content-fs`: временные файлы рядом с целевыми → резервные копии заменяемых → переименования → при сбое откат из копий | Группа файлов одного вызова пишется целиком или не пишется (M3-N04) | Запись по одному файлу |
| D5 | Идемпотентность: `.cache/mcp/requests.jsonl` хранит `requestId`, инструмент, хэш входа и результат; тот же `requestId` с другим входом — ошибка `REQUEST_ID_REUSED` | Переживает перезапуск сервера; потеря кэша не трогает данные | Только память процесса |
| D6 | Поиск: `core/src/search/` строит индекс MiniSearch из модели контента; сервер держит его в памяти и перестраивает после каждой записи | Корпус маленький; та же функция в M4 сериализует индекс в bundle (ADR-0014) | Инкрементальный индекс |
| D7 | Новый инструмент `archive_package` (`path`, `requestId`) переносит пакет в `inbox/done/`; `import_package` остаётся без побочных эффектов | Перенос — запись, ей нужны `requestId` и подтверждение после отбора | Перенос внутри `import_package` |
| D8 | Квиз: сервер держит снимок replay в памяти; `record_review` строит событие (ULID из `core` с внешним RNG и `now`), дописывает его и переигрывает один review item; при `lapses ≥ leechThreshold` дописывает `suspend` | Быстрый ответ, тот же replay, что в M2 | Полный replay на каждый ответ |
| D9 | `quiz_next` и `reveal` отдают Markdown секций, а не HTML | ИИ читает Markdown; HTML нужен только UI | HTML из bundle |
| D10 | Hook — `wastech-learn hook post-tool-use`: читает JSON события Claude Code из stdin, пропускает пути вне `content/**`, запускает `lintFiles` mdlint и `check`, находки пишет в stderr с кодом `2` | Код `2` возвращает находки агенту; логика в CLI и `content-fs`, а не в shell-скрипте | Два вызова в `settings.json` |
| D11 | В контенте пакеты — точные devDependencies, сервер в `.mcp.json` — `npx --no-install wastech-learn-mcp --content .` | Так уже подключён mdlint; версия фиксируется lockfile, без сети при запуске | `npx -y …@version` из capture.md (обновить документ) |
| D12 | Skills `learn-capture`, `learn-import`, `learn-quiz` — в `skills/<name>/` с `templates/`; промпт экспорта — `skills/learn-import/templates/export-prompt.{en,ru,pl}.md` | Конвенции `wastech-skills`; установка и фиксация — `npx skills add` с `skills-lock.json` | Skills в контент-репозитории |

## Пакеты и модули

| Пакет | Что добавляется |
| --- | --- |
| `core` | `schema/mcp/` (входы инструментов), `schema/package.ts` (learning package v1), `serialize/`, `search/`, `id.ts` (генератор `id` и ULID с внешним RNG), ключи сообщений для ошибок MCP |
| `content-fs` | `validate-overlay.ts`, `transaction.ts`, `requests.ts` (D5), `write/` (тема, карточки, summary, materials, диаграмма через `render`), `inbox.ts` |
| `mcp-server` | `server.ts` (SDK, stdio, `--content`), по файлу на группу инструментов: `content-tools.ts`, `quiz-tools.ts`, `package-tools.ts`; маппинг `LearnError` → `{ code, message, hint }` |
| `cli` | `new-id`, `hook post-tool-use` |
| `skills/` | три skill, шаблоны, промпт экспорта на трёх языках |

## Контракты

- **Инструменты** — таблицы [mcp-tools](../../ai/mcp-tools.md) плюс `archive_package` (D7). Каждый мутирующий принимает `requestId` и `dryRun`; ответ — пути, `id`, находки.
- **Путь из входа** нормализуется и сверяется с `--content` после разрешения символических ссылок; иначе `PATH_OUTSIDE_CONTENT`.
- **`update_card` с `meaningChanged`:** старая карточка получает `status: retired`, новая — новый `id`; обе записи — одна транзакция.
- **Слияние при импорте** в существующую тему: секции summary, которых нет, добавляются; существующие не меняются, новый текст уходит в `## Open questions`.

## Ошибки и пограничные случаи

- Находки mdlint или `check` → ответ с находками, ничего не записано (это не ошибка инструмента).
- Повтор `requestId` → прежний ответ; другой вход с тем же `requestId` → `REQUEST_ID_REUSED`.
- Синтаксическая ошибка Mermaid → находка от `render`, файлы не пишутся; нет `alt` → находка схемы.
- `record_review` для `item` без карточки или с `status` не `active` → `ITEM_NOT_ACTIVE`.
- Внешняя правка файлов во время работы сервера: индекс и модель перечитываются перед каждой мутацией по времени изменения файлов.

## Тестирование

- **Unit:** схемы входов, сериализация туда-обратно с разбором M2, транзакция с имитацией сбоя, хранилище `requestId`, генераторы `id` и ULID.
- **Контракт** (по [testing](../../../.rules/testing.md)): каждый инструмент на временной копии golden — валидация, `dryRun`, идемпотентность, ограничение путей, `quiz_next` без ответа.
- **Hook:** CLI-тест с JSON события на stdin.
- **Ручная приёмка:** одна реальная тема из Claude Code и одна из ChatGPT, время захвата.

## Документы вне спеки, которые меняет M3

[mcp-tools](../../ai/mcp-tools.md) (`archive_package`), [capture](../../ai/capture.md) (`.mcp.json` по D11, hook по D10), [components](../../architecture/components.md) (`serialize`, `search`, транзакция).
