# Фаза 07 — Инструменты квиза

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 05, M2 08
- **Даёт:** `queue_status`, `quiz_next`, `reveal`, `record_review`, `undo_last`, автоматический `suspend`

## Цель

Повторение в чате с записью в журнал.

## Шаги

1. `quiz-tools.ts`: снимок replay в памяти, Markdown секций в ответах (D8, D9).
2. `record_review`: событие v1 writer `mcp`, частичный replay, `suspend` при пороге leech.
3. `undo_last` через событие `undo`.

## Затронутые файлы

- `packages/mcp-server/src/quiz-tools.ts`

## Правила

Журнал append-only; `quiz_next` без ответа; время и ULID — входы ядра. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Контракт, включая сравнение due с replay M2.

## Приёмка фазы

- [ ] AC-F08a–e проходят.
- [ ] Lint и тесты зелёные.
