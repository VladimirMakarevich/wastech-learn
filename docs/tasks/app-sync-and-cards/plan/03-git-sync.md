# Фаза 03 — Синхронизация

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 02
- **Даёт:** `syncRepository` и `pullRepository`; маршруты `/api/git/sync` и `/api/git/pull`

## Цель

Одна кнопка отправляет и получает, а сбой не оставляет репозиторий в середине операции (AS-F06…AS-F08).

## Шаги

1. `git/sync.ts`: add по трём путям → commit → pull --rebase с autostash → push (design D4).
2. Откат при конфликте, коды `conflict`, `auth-required`, `no-upstream`, `busy`, `blocked`, `push-rejected`, `git-failed` (design D5).
3. Маршруты `POST /api/git/sync` и `POST /api/git/pull` через очередь операций; `git-changed` после операции.

## Затронутые файлы

- `packages/content-fs/src/git/sync.ts`
- `packages/server/src/server.ts`
- `packages/content-fs/test/git-sync.test.ts`
- `packages/server/test/git-routes.test.ts`

## Правила

Сеть в тестах не открывается: удалённый — bare-репозиторий во временной папке ([testing](../../../../.rules/testing.md)).

## Тесты

Обычный путь, нечего коммитить, «другие» файлы, конфликт с откатом, запрос пароля через `GIT_ASKPASS`, сообщение с метасимволами, две вкладки.

## Приёмка фазы

- [x] Unit и контрактная части AC-F06…AC-F08, AC-N01a, AC-N01b, AC-N02.
- [x] Lint и тесты зелёные.
