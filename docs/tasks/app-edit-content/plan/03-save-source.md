# Фаза 03 - `readSource` и `saveSource`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 01, 02
- **Даёт:** Запись правки с проверкой, решением о смысле и защитой `id`

## Цель

Вся логика сохранения в `content-fs`, поверх `applyWrite`: здесь проверяется всё, что касается целостности данных (design D1, D4-D7).

## Шаги

1. `packages/content-fs/src/write/source.ts` - `readSource(workspace, path)`: `editableKind`, `confinePath`, текст и `version` = `sha256Hex`. Чего нет на диске или что не признано - `source-not-found`.
2. `saveSource(workspace, input)` в порядке D4: версия (не совпала, но текст на диске равен новому → `unchanged`; иначе `content-changed`) → тот же текст (`unchanged`) → для карточки `id` (находка `card-id-changed` на строке `id:`; сравнение с `id` до правки, при нечитаемом старом тексте - с именем файла) → `cardEditDecision` (нужен вопрос и нет `meaning` → `decision-needed`) → план записи → `applyWrite`.
3. План записи: `meaning: "new"` - через `write/successor.ts` из фазы 02, старый файл берётся с диска; изменённый `#` - `withCardLinks` и `index.md` как `incidental`; `summary.md` и `materials.md` с неизменённым `updated` - сегодняшняя дата через `calendarDate`. После `meaning: "same"` находка `active-edit` этого файла убирается из ответа.
4. Экспорт из `packages/content-fs/src/index.ts`.

## Затронутые файлы

- `packages/content-fs/src/write/source.ts`
- `packages/content-fs/src/index.ts`
- `packages/content-fs/test/source.test.ts`

## Правила

Запись только через `applyWrite`: проверка до записи, транзакция, повторная сверка диска ([ADR-0012](../../../adr/0012-two-tier-validation.md)); `id` стабилен; журнал не трогается ([architecture](../../../../.rules/architecture.md)).

## Тесты

На копии golden: `written`, `unchanged` (в том числе повтор после записи), `content-changed`, `card-id-changed` со строкой, `decision-needed`, `same` и `new`, `## Cards` после смены `#`, `updated`, находки `blocked` со строками, в том числе в другом файле; недопустимые пути и символическая ссылка наружу; сбой транзакции «новой карточки» через подмену `TransactionFs`; `reviews/**` после правок байт в байт прежние.

## Приёмка фазы

- [ ] AC-F08a, AC-F08b, AC-F09, AC-F10, AC-F11a, AC-F11c, AC-F12, AC-F13, AC-F14, AC-F15b (на копии), AC-N01a (на копии), AC-N02a, AC-N02c проходят.
- [ ] `npm run lint` и `npm test` зелёные.
