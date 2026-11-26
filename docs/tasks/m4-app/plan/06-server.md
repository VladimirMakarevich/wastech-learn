# Фаза 06 — Сервер и `serve`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 04, 05
- **Даёт:** Пакет `server`, маршруты `/api/*`, защита, SSE, команда `serve`

## Цель

Тонкий локальный хост: bundle, журнал, приём событий и уведомления (design D2–D5, [ADR-0007](../../../adr/0007-local-server-phase-1.md)).

## Шаги

1. `packages/server`: `createServer({ content, device, appDir })` на Hono; `GET /api/status`, `/api/bundle` с `ETag`, `/api/events`, `POST /api/events`, `GET /api/changes` (SSE); остальные пути — файлы `appDir` с возвратом к `index.html`.
2. `guard.ts`: `Host`, `Origin`, `Content-Type`, лимит тела 256 KB, без CORS-заголовков (D3).
3. Пересборка bundle по `watchRepository`, последний рабочий bundle при ошибке, `build-failed` с находками; замер времени пересборки на реальном контенте — в журнал спеки (D5).
4. `start.ts`: `@hono/node-server` на `127.0.0.1`. CLI `serve --content [--port] [--no-open]`; занятый порт — ошибка с подсказкой.
5. [components](../../../architecture/components.md) и [data-flows](../../../architecture/data-flows.md): маршруты и SSE.

## Затронутые файлы

- `packages/server/src/`
- `packages/cli/src/serve.ts`
- `eslint.config.js`, `tsconfig.json`

## Правила

Хост тонкий; каждое событие разбирается схемой `core`; дозапись только в свой файл `web` ([security](../../../../.rules/security.md)).

## Тесты

Контракт на каждый маршрут через `app.request()` на копии golden, наблюдатель подменён; CLI-тест `serve` с портом `0`.

## Приёмка фазы

- [x] AC-F01, AC-F02a, AC-F02b, AC-F03b (контракт), AC-N07, AC-N08 проходят.
- [x] Лицензии Hono и `@hono/node-server` в журнале спеки; lint и тесты зелёные.
