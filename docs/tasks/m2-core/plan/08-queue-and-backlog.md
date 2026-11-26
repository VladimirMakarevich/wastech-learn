# Фаза 08 — Граница дня, очередь и бэклог

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 07
- **Даёт:** Очередь дня, siblings, политика бэклога, оценка времени, режим «N минут»

## Цель

Превратить состояния в то, что пользователь повторит сегодня, по политике из backlog.

## Шаги

1. `srs/src/day.ts`: граница дня по `dayStartsAt` в `timezone` через `Intl`, тест перехода на летнее время.
2. `srs/src/queue.ts` и `backlog.ts`: порядок, лимиты, siblings, пауза и возврат новых, leech скрыты, порядок при бэклоге — параметр (D7).
3. `srs/src/estimate.ts`: минуты по медиане `durMs` с оценками по умолчанию.
4. Property-тесты на fast-check.

## Затронутые файлы

- `packages/srs/src/day.ts`
- `packages/srs/src/queue.ts`
- `packages/srs/src/backlog.ts`
- `packages/srs/src/estimate.ts`

## Правила

Сортировка полная и стабильная, ничья решается по `id`. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Unit на правила политики, property на лимиты, siblings, learning первыми и `undo`.

## Приёмка фазы

- [ ] AC-F08a–d, AC-N03 проходят; выбор следующей карточки < 50 мс.
- [ ] Lint и тесты зелёные.
