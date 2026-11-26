# Фаза 02 — Метрики в `srs`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** —
- **Даёт:** True retention, прогноз нагрузки, дата последней сессии

## Цель

Посчитать из журнала всё, что показывают Home, итоги и Stats, чистыми функциями ([metrics](../../../scheduling/metrics.md)).

## Шаги

1. `packages/srs/src/metrics.ts`: true retention young (интервал < 21 дня) и mature за окно в днях по календарю `createCalendar`.
2. Прогноз нагрузки: число due по дням на N дней вперёд и минуты по медианам `estimateDurations`.
3. Дата последней сессии и признак «пауза больше 3 дней» для плана возврата ([backlog](../../../scheduling/backlog.md)).
4. Экспорт из `index.ts`.

## Затронутые файлы

- `packages/srs/src/metrics.ts`
- `packages/srs/src/index.ts`
- `packages/srs/test/metrics.test.ts`

## Правила

`now` и `tz` — входы; `srs` не импортирует `core` ([architecture](../../../../.rules/architecture.md)).

## Тесты

Ручной подсчёт на golden-журнале как ожидание; граница дня через DST; пустой журнал.

## Приёмка фазы

- [x] Unit-часть AC-F13 и AC-F17 проходит.
- [x] Lint и тесты зелёные.
