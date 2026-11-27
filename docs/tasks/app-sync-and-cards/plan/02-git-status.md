# Фаза 02 — Состояние git

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 01
- **Даёт:** `content-fs/git`: запуск, разбор `status`, сообщение коммита; `GET /api/git` и событие `git-changed`

## Цель

Сервер знает и отдаёт состояние контент-репозитория (AS-F01).

## Шаги

1. `content-fs/src/git/run.ts`: `execFile` без оболочки, окружение и таймаут (design D2); общий с `git-baseline.ts` запуск.
2. `git/status.ts`: разбор `--porcelain=v2 --branch -z` и классификация путей (design D3), признаки `blocked` (design D5).
3. `git/message.ts`: сообщение по умолчанию (design D10).
4. `server`: `openWorkspace` на старте, очередь операций (design D6), `GET /api/git`, событие SSE `git-changed` после изменений файлов.

## Затронутые файлы

- `packages/content-fs/src/git/{run,status,message}.ts`
- `packages/content-fs/src/git-baseline.ts`
- `packages/content-fs/src/index.ts`
- `packages/server/src/{server,changes}.ts`
- `packages/content-fs/test/git-status.test.ts`
- `packages/server/test/git-routes.test.ts`

## Правила

Логика в `content-fs`, сервер тонкий ([architecture](../../../../.rules/architecture.md)).

## Тесты

Фикстуры вывода porcelain v2 (переименование, удаление, неотслеживаемые в новой папке, detached, без upstream); временный репозиторий; контракт маршрута.

## Приёмка фазы

- [ ] Unit и контрактная части AC-F01, AC-F08c, AC-N03 (на копии).
- [ ] Lint и тесты зелёные.
