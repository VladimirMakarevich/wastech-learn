# Фаза 08 — Hook `PostToolUse`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 04
- **Даёт:** Подкоманда `wastech-learn hook post-tool-use`

## Цель

Подстраховать ручные правки ИИ через Edit и Write.

## Шаги

1. `cli/src/hook.ts`: JSON события из stdin, фильтр `content/**`, `lintFiles` mdlint и `check`, находки в stderr с кодом `2` (D10).

## Затронутые файлы

- `packages/cli/src/hook.ts`

## Правила

Логика проверки — в `content-fs`, CLI только связывает. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

CLI-тест с JSON на stdin.

## Приёмка фазы

- [x] AC-F10 проходит.
- [x] Lint и тесты зелёные.
