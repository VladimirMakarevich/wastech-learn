# Фаза 04 - Архив, удаление и статус темы

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 01
- **Даёт:** `deleteCard`, `restoreCard`, `setTopicStatus`, очередь без архивных тем; маршруты карточек и тем

## Цель

Изменять жизнь карточки и темы из приложения с теми же проверками, что у MCP (AS-F11…AS-F14).

## Шаги

1. `transaction.ts`: удаление файла внутри транзакции.
2. `write/cards.ts`: `deleteCard` (файл и ссылка в `index.md`) и `restoreCard` (текст из `HEAD`) через `applyWrite` (design D8); архив и возврат - существующий `updateCard` (design D7).
3. `write/topic.ts`: `setTopicStatus` (design D9).
4. `session`: `toQueueCards` и `bundleQueueCards` пропускают карточки архивных тем.
5. Маршруты `POST /api/cards/:id/status`, `DELETE /api/cards/:id`, `POST /api/cards/:id/restore`, `POST /api/topics/:domain/:topic/status` через очередь операций.

## Затронутые файлы

- `packages/content-fs/src/transaction.ts`
- `packages/content-fs/src/write/{cards,topic}.ts`
- `packages/session/src/ports.ts`
- `packages/server/src/server.ts`
- `packages/content-fs/test/*`
- `packages/session/test/ports.test.ts`
- `packages/server/test/card-routes.test.ts`

## Правила

Журнал не трогается; `retired` не удаляется автоматически ([cards](../../../content/cards.md)).

## Тесты

Блокировка находками, `content-changed`, отмена удаления с сохранением чужих правок `index.md`, архивная тема в очереди приложения и `quiz_next`.

## Приёмка фазы

- [x] Unit и контрактная части AC-F11…AC-F14, AC-N01c.
- [x] Lint и тесты зелёные.
