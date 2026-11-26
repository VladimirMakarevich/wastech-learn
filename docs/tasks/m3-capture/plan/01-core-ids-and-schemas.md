# Фаза 01 — Генераторы `id`, схемы пакета и входов

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** M2 01–08
- **Даёт:** Генераторы `id` и ULID, схема learning package v1, Zod-схемы входов инструментов, команда `new-id`

## Цель

Дать серверу и импорту проверенные формы входа и источник новых идентификаторов.

## Шаги

1. `core/src/id.ts`: `id` карточки (8 символов Crockford base32) и ULID события с внешним RNG и `now`.
2. `core/src/schema/package.ts`: learning package v1 по [learning-package](../../../ai/learning-package.md), включая разбор `### type · bloom · idea` и строк `Q:`, `A:`, `R:`, `E:`.
3. `core/src/schema/mcp/`: входы всех инструментов, включая `archive_package` (D1).
4. `cli/src/new-id.ts`.

## Затронутые файлы

- `packages/core/src/id.ts`
- `packages/core/src/schema/package.ts`
- `packages/core/src/schema/mcp/`
- `packages/cli/src/new-id.ts`

## Правила

Случайность и время — входы; одна схема на форму. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Unit генераторов с сидом, схемы пакета на примере из документа и на ошибках.

## Приёмка фазы

- [ ] AC-F07b, AC-F11 проходят.
- [ ] Lint и тесты зелёные.
