# Фаза 12 — Stats и Settings

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 02, 08
- **Даёт:** Статистика и настройки

## Цель

Минимальная статистика из журнала и настройки, которые не трогают репозиторий (FR-403, FR-509, M4-Q1).

## Шаги

1. Stats: true retention young и mature за 7 и 30 дней и прогноз на 30 дней из `srs/metrics`; сгруппированные списки и одна подписанная диаграмма, как в прототипе, без библиотеки графиков.
2. Settings: язык UI, тема, длительность «5 минут» (`localStorage`); проверка голоса `pl-PL`; DR, лимиты доменов и устройство — только показ из `/api/status` с подсказкой, что правка — в `learn.config.json`.

## Затронутые файлы

- `packages/app/src/app/screens/stats/`
- `packages/app/src/app/screens/settings/`
- `packages/app/e2e/stats.spec.ts`, `settings.spec.ts`

## Правила

Без heatmap и стриков ([metrics](../../../scheduling/metrics.md)); приложение не пишет контент ([out-of-scope](../out-of-scope.md)).

## Тесты

E2E: числа Stats против ручного подсчёта; настройки переживают перезагрузку; `git status` копии чистый; смена языка меняет все подписи.

## Приёмка фазы

- [x] AC-F17, AC-F18, AC-F19 (e2e) проходят.
- [x] Lint, тесты и e2e зелёные.
