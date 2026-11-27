# Фаза 01 — Правила правки в `core`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** —
- **Даёт:** `editableKind`, `cardEditDecision`, схемы `/api/source`

## Цель

Чистые правила, на которых стоят сервер и приложение: какой файл можно править, когда спрашивать «та же или новая», что приходит и уходит по `/api/source` (design D2, D3, D5).

## Шаги

1. `packages/core/src/edit/editable.ts`: `editableKind(path)` → `card`, `topic-index`, `summary`, `materials` или `undefined` по шаблонам `content/<domain>/<topic>/…`.
2. `packages/core/src/edit/decision.ts`: `cardEditDecision(before, after)` → `{ largeEdit: { section, percent }[], removedVariants: string[] }`. Вопрос нужен, только если `status: active` до и после; доля слов — `changedWordShare` по `Question` и `Answer` с порогом `ACTIVE_EDIT_THRESHOLD`; варианты — `variantsFor` до и после. Нечитаемый текст до или после — решения нет, его ловит проверка.
3. `packages/core/src/schema/source.ts`: Zod-схемы запроса `PUT` (`path`, `version`, `text`, `meaning?`) и ответов (`written`/`unchanged`, `content-changed`, `decision-needed`, `blocked`, `source-not-found`). Экспорт из `index.ts`.

## Затронутые файлы

- `packages/core/src/edit/editable.ts`, `packages/core/src/edit/decision.ts`
- `packages/core/src/schema/source.ts`
- `packages/core/src/index.ts`
- `packages/core/test/edit.test.ts`

## Правила

`core` чистый и без Node API; нет `any`, `enum`, экспортов по умолчанию; комментарии объясняют «почему» ([coding-style](../../../../.rules/coding-style.md)).

## Тесты

Unit: `editableKind` на допустимых и недопустимых путях (`reviews/…`, `diagrams/…`, `..`, файлы вне `content/`); `cardEditDecision` — порог 40% по обе стороны, смена `type` `basic` → `reversed`, удалённый и добавленный пропуск cloze, `draft` и `retired` без вопроса; разбор схем на примерах.

## Приёмка фазы

- [ ] AC-F11a (unit), AC-F11b проходят.
- [ ] `npm run lint` и `npm test` зелёные.
