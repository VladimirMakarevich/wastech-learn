# Фаза 04 — ADR-0017 и маршруты сервера

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 03
- **Даёт:** ADR, `Workspace` в сервере, `GET` и `PUT /api/source`

## Цель

Сначала решение о границе, потом код: локальный сервер впервые пишет Markdown (design D8, D9, D14).

## Шаги

1. ADR-0017 общий с [app-sync-and-cards](../../app-sync-and-cards/index.md) (design D14). Уже принят — строка в его «Последствиях»: правка файлов тем и карточек через `/api/source`. Ещё нет — `docs/adr/0017-app-server-writes-and-git.md` пишется сразу на обе спеки, раздел о git — по design app-sync-and-cards. У [ADR-0007](../../../adr/0007-local-server-phase-1.md) — датированная строка в «Последствиях»; [adr/README](../../../adr/README.md) — строка в списке.
2. [.rules/security.md](../../../../.rules/security.md) и [.rules/architecture.md](../../../../.rules/architecture.md): что и как пишет локальный сервер (дополнить, если раздел уже есть).
3. `packages/server/src/server.ts`: `ServerOptions.random`; `Workspace` и очередь операций сервера — если их ещё нет, вводятся здесь в том виде, что описан в design app-sync-and-cards (D6 там). `packages/cli/src/serve.ts` передаёт `random`.
4. `packages/server/src/source.ts`: `GET /api/source` и `PUT /api/source` за `guard` и `limitBody`; путь допускается, только если он назван в последнем собранном bundle; тело — схемой `core`; запись через общую очередь; после `written` — пересборка bundle, `content-changed`, потом ответ. Коды — по контракту design.
5. [components](../../../architecture/components.md) и [data-flows](../../../architecture/data-flows.md): маршруты `/api/source`, `Workspace` в сервере.

## Затронутые файлы

- `docs/adr/0017-app-server-writes-and-git.md`, `docs/adr/0007-local-server-phase-1.md`, `docs/adr/README.md`
- `packages/server/src/server.ts`, `packages/server/src/source.ts`
- `packages/cli/src/serve.ts`
- `packages/server/test/source.test.ts`

## Правила

Хост тонкий; ADR **до** кода; только `127.0.0.1`; каждое тело разбирается схемой `core`; текст правки не попадает в логи и ответы об ошибках ([security](../../../../.rules/security.md)).

## Тесты

Контракт через `app.request()` на копии golden: все коды контракта, путь вне bundle и вне `content/`, чужой `Origin` → 403, `text/plain` → 415, > 256 KB → 413, пересборка до ответа (новый `ETag`), два параллельных `PUT` с новыми `#` в одну тему, сбой записи → 500 `io-failed` без текста.

## Приёмка фазы

- [ ] AC-F15a (контракт), AC-N01a, AC-N01b, AC-N01c, AC-N02b проходят.
- [ ] Владелец сделал первый замер AC-N03 на реальном контенте через `curl` или скрипт; итог в журнале спеки, при > 2 с — решение по запасному пути из рисков плана.
- [ ] `npm run lint` и `npm test` зелёные.
