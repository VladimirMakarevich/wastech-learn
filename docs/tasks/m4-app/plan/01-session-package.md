# Фаза 01 - ADR-0015 и пакет `session`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** -
- **Даёт:** ADR, пакет с маппингом портов, событием оценки, правилом leech и прогнозом интервалов; квиз MCP на нём

## Цель

Сделать логику оценки доступной браузеру, не меняя поведения квиза в чате (design D1, M4-Q9).

## Шаги

1. `docs/adr/0015-session-package.md`: пакет `session` и replay в клиенте без кэша `node:sqlite` в фазе 1; строка в «Последствиях» ADR-0007; индекс ADR.
2. [components](../../../architecture/components.md), [.rules/architecture.md](../../../../.rules/architecture.md), `eslint.config.js`: `session` без Node API, импортирует `core` и `srs`; `app` может импортировать `session`; ссылки в корневом `tsconfig.json`.
3. `packages/session`: `ports.ts` - `toQueueCards`, `toReplayEvents`, `toSrsConfig` из `content-fs/load.ts` вместе с проверкой `satisfies`; `event.ts` - события `review`, `undo`, `suspend`, `unsuspend`, `reset` с внешними `now` и RNG, `durMs` ≤ 120 000; `leech.ts`; `preview.ts` - интервалы четырёх кнопок.
4. `content-fs/study.ts` и `load.ts` переходят на `session`; публичный API `content-fs` для `mcp-server` не меняется.

## Затронутые файлы

- `docs/adr/0015-session-package.md`
- `packages/session/src/`
- `packages/content-fs/src/study.ts`, `load.ts`
- `eslint.config.js`, `tsconfig.json`

## Правила

Изменение границы - ADR до кода ([architecture](../../../../.rules/architecture.md)); `session` чистый и детерминированный; рефакторинг под тестами без изменения ожиданий ([refactoring](../../../../.rules/refactoring.md)).

## Тесты

Unit на событие, leech и прогноз против прямых вызовов ts-fsrs; тесты `content-fs` и `mcp-server` - без изменений.

## Приёмка фазы

- [x] AC-N09 проходит; импорт `content-fs` из `session` ловит ESLint.
- [x] ADR-0015 принят владельцем; lint и тесты зелёные.
