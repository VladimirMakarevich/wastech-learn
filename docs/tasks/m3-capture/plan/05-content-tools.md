# Фаза 05 - Сервер и инструменты контента

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 03, 04
- **Даёт:** Пакет `mcp-server` на stdio с `create_topic`, `add_cards`, `update_card`, `save_summary`, `save_materials`, `validate`, `search`

## Цель

Первый рабочий захват через MCP без диаграмм и пакетов.

## Шаги

1. Поставить `@modelcontextprotocol/sdk` точной версией; `server.ts` с `--content`.
2. `content-tools.ts`: тонкие обработчики над `content-fs`; маппинг ошибок в `{ code, message, hint }` из каталога сообщений.
3. Перечитывание модели и индекса перед мутацией по времени изменения файлов.
4. Контрактные тесты через клиент SDK.

## Затронутые файлы

- `packages/mcp-server/src/server.ts`
- `packages/mcp-server/src/content-tools.ts`

## Правила

Хост тонкий; `requestId` и `dryRun` у каждого мутирующего инструмента; короткие ответы. Общие правила - [.rules/README.md](../../../../.rules/README.md).

## Тесты

Контракт на каждый инструмент.

## Приёмка фазы

- [x] AC-F01, AC-F02a-d, AC-F03a-b, AC-F04a-c, AC-F06, AC-N03, AC-N07 проходят.
- [x] Lint и тесты зелёные.
