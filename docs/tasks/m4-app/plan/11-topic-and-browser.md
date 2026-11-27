# Фаза 11 — Topic и Browser

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 08
- **Даёт:** Страница темы, поиск и браузер карточек

## Цель

Читать тему перед повторением и после ошибок, находить и чинить карточки (FR-302…FR-305, FR-309).

## Шаги

1. Topic: оглавление секций с переведёнными заголовками, summary через `bundleHtml`, материалы, карточки темы со статусом, R и due; `Self-check` раскрывается по одному вопросу; «Открыть в VS Code».
2. Поиск `/`: индекс из `bundle.searchIndex` через `core`, результаты по темам и карточкам.
3. Browser: фильтры домена, темы, тега, типа, статуса, `leech`, «изменена»; таблица с R, due, lapses, последней оценкой; просмотр карточки в боковой панели (CDK `overlay`); `e`, `o`, `unsuspend`.

## Затронутые файлы

- `packages/app/src/app/screens/topic/`
- `packages/app/src/app/screens/browser/`
- `packages/app/e2e/topic.spec.ts`, `browser.spec.ts`

## Правила

Контент на `lang` темы, подписи — на языке UI ([multilang](../../../content/multilang.md)); HTML только через `bundleHtml`.

## Тесты

E2E на golden и журнале-фикстуре: 12 секций, SVG, Shiki, KaTeX, `Self-check`; фильтр `leech`; поиск без сетевых запросов; `unsuspend` возвращает карточку в очередь.

## Приёмка фазы

- [x] AC-F05 (e2e), `unsuspend` из AC-F11, AC-F15, AC-F16 проходят.
- [x] Lint, тесты и e2e зелёные.
