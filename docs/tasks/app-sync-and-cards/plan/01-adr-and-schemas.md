# Фаза 01 — ADR-0017, правила и схемы

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** —
- **Даёт:** ADR, правила безопасности для сервера, схемы тел и коды ошибок в `core`

## Цель

Зафиксировать новую границу до первого кода: сервер приложения пишет контент и запускает git.

## Шаги

1. `docs/adr/0017-app-server-writes-and-git.md` (accepted): контекст, решение (design D1, D2, D4, D6), альтернативы; строка в «Последствиях» [ADR-0007](../../../adr/0007-local-server-phase-1.md); строка в `docs/adr/README.md`.
2. [.rules/security.md](../../../../.rules/security.md), раздел о локальном сервере: git без оболочки с фиксированными аргументами, `GIT_TERMINAL_PROMPT=0`, только пути `content/`, `reviews/`, `inbox/`, сеть только по нажатию.
3. `core/src/schema/app.ts`: тела `/api/git/sync`, `/api/cards/:id/status`, `/api/topics/:domain/:topic/status` (design D12); экспорт из `index.ts`.
4. Коды ошибок `git-*` и `card-*` с сообщениями ru/en/pl в каталоге `core`.

## Затронутые файлы

- `docs/adr/0017-app-server-writes-and-git.md`
- `docs/adr/0007-local-server-phase-1.md`
- `docs/adr/README.md`
- `.rules/security.md`
- `packages/core/src/schema/app.ts`
- `packages/core/src/messages/{en,ru,pl}.ts`
- `packages/core/test/schema-app.test.ts`

## Правила

ADR до кода ([documentation](../../../../.rules/documentation.md)); Zod-схемы только в `core`, без `any` и enums ([coding-style](../../../../.rules/coding-style.md)).

## Тесты

Схемы принимают допустимые тела и называют поле в недопустимых; паритет сообщений на трёх языках.

## Приёмка фазы

- [ ] ADR-0017 и правила согласованы владельцем.
- [ ] Lint и тесты зелёные.
