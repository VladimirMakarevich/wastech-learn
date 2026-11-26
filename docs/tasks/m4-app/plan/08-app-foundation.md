# Фаза 08 — Данные и основа UI

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 07
- **Даёт:** `ReviewStore`, bundle, SSE, `bundleHtml`, i18n, токены и компоненты Evening Glass, клавиши, оболочка

## Цель

Всё, на чём стоят экраны: данные, язык, вид и клавиатура (design D7, D9, D11, D12).

## Шаги

1. `data/`: `ReviewStore` и `HttpReviewStore` с очередью неотправленных событий в памяти и `localStorage`; загрузка bundle по `ETag`, статус, `EventSource` с переподключением; ответы сервера разбираются схемами `core`.
2. Директива `bundleHtml` — единственное место с `bypassSecurityTrustHtml`; скрытие пропусков cloze по `data-cloze`.
3. i18n из `wastechlab-mobile-template`: сервис на signals, pipe `t`, словари ru/en/pl, `Intl.PluralRules`, паритет ключей и аудит литералов как тесты Vitest.
4. Evening Glass: токены и стили из прототипа, Inter с `OFL.txt`, CSS KaTeX и переменные Shiki локально; тёмная и светлая темы, следование ОС.
5. `ui/`: кнопка, сегменты, переключатель, степпер, сгруппированный список, точки памяти, тост, баннер `build-failed`.
6. `keys/`: клавиши по экрану, последовательность `g h`, `/`; без срабатывания в полях ввода. Оболочка: навигация, поиск, язык, тема, кнопка «Обновить» (FR-311).

## Затронутые файлы

- `packages/app/src/app/data/`, `i18n/`, `ui/`, `keys/`
- `packages/app/src/styles/`, `packages/app/public/fonts/`

## Правила

HTML только из bundle ([security](../../../../.rules/security.md)); тексты без вины ([tone-of-voice](../../../../.rules/tone-of-voice.md)); DESIGN.md — источник правды по виду.

## Тесты

Vitest: очередь `HttpReviewStore` с подменой `fetch`, паритет и плюралы, аудит литералов, разбор клавиш, запрещённые формулировки в словарях.

## Приёмка фазы

- [ ] AC-F04, unit-часть AC-F19, AC-N06 проходят.
- [ ] Lint, тесты и e2e зелёные.
