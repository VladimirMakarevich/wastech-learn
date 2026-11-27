# Фаза 02 — Вынос логики преемника

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** —
- **Даёт:** `write/successor.ts`, `updateCard` на нём без изменения поведения

## Цель

Правило [ADR-0002](../../../adr/0002-card-identity-and-review-items.md) «смысл изменился → старая в `retired`, новая с новым `id`» живёт в одном месте для `update_card` и для приложения (design D6).

## Шаги

1. `packages/content-fs/src/write/successor.ts`: функция, которая по снимку, старой карточке и документу преемника строит файлы записи — старый файл с `status: retired`, новый файл с новым `id` и `created`, `index.md` темы со строкой в `## Cards`.
2. `packages/content-fs/src/write/cards.ts`: ветка `meaningChanged` в `updateCard` вызывает её; поведение и результат не меняются.

## Затронутые файлы

- `packages/content-fs/src/write/successor.ts`
- `packages/content-fs/src/write/cards.ts`

## Правила

Рефакторинг локальный и без изменения поведения, отдельным коммитом `refactor(content-fs): …` ([refactoring](../../../../.rules/refactoring.md)).

## Тесты

Новых тестов поведения нет: существующие тесты `update_card` в `content-fs` и `mcp-server` зелёные до и после.

## Приёмка фазы

- [ ] Тесты `update_card` с `meaningChanged` проходят без изменений.
- [ ] `npm run lint` и `npm test` зелёные.
