# Фаза 04 — Путь записи в `content-fs`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 02, M2 06
- **Даёт:** Проверка с наложением, транзакция, хранилище `requestId`, запись тем, карточек, summary, materials, диаграмм и работа с `inbox/`

## Цель

Собрать всё, что делает запись безопасной, до первого инструмента.

## Шаги

1. `validate-overlay.ts`: наложение на карту репозитория, `lintContent` по конфигу контента и `check` (D3).
2. `transaction.ts`: временные файлы, резервные копии, переименования, откат (D4).
3. `requests.ts`: `.cache/mcp/requests.jsonl` (D5).
4. `write/` и `inbox.ts`; ограничение путей после разрешения символических ссылок.

## Затронутые файлы

- `packages/content-fs/src/validate-overlay.ts`
- `packages/content-fs/src/transaction.ts`
- `packages/content-fs/src/requests.ts`
- `packages/content-fs/src/write/`

## Правила

Каждая запись проходит mdlint и `check`; IO только здесь. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Unit с подменой ФС для отката, временные папки для остального.

## Приёмка фазы

- [x] AC-N02, AC-N04 проходят.
- [x] Lint и тесты зелёные.
