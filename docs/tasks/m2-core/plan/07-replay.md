# Фаза 07 — Адаптер ts-fsrs и replay

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 01, 06
- **Даёт:** `srs`: планировщик из конфигурации, replay с семантикой событий, канонический снимок

## Цель

Получить настоящее состояние review items из журнала, побайтно воспроизводимое.

## Шаги

1. `srs/src/scheduler.ts`: `DefaultScheduler` из `ts-fsrs@6.0.1` с параметрами Q-02, создаётся один раз.
2. `srs/src/replay.ts`: события по таблице в design (D2), leech по `leechThreshold`.
3. `srs/src/snapshot.ts`: канонический JSON (D8).
4. `content-fs/src/load.ts`: `ReviewEvent` → `ReplayEvent` через `satisfies` (D1).
5. Генератор журнала около 1000 событий с сидом для теста детерминизма.

## Затронутые файлы

- `packages/srs/src/scheduler.ts`
- `packages/srs/src/replay.ts`
- `packages/srs/src/snapshot.ts`
- `packages/content-fs/src/load.ts`

## Правила

`srs` не импортирует `core`; время и сид — входы; точная версия ts-fsrs. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Unit против прямого вызова ts-fsrs, тест детерминизма с перемешиванием и разными `TZ`.

## Приёмка фазы

- [x] AC-F07a–c, AC-N01 проходят.
- [x] Lint и тесты зелёные.
