# Фаза 02 — Разбор контента и загрузка репозитория

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 01
- **Даёт:** Модель контента из карты файлов; `content-fs` грузит конфиг, `learn.local.json` и контент; golden-фикстуры

## Цель

Превратить файлы контента в типизированную модель с review items и `contentHash`.

## Шаги

1. Скопировать golden sample в `fixtures/golden/` и записать в `fixtures/README.md`, откуда и как обновлять копию.
2. `core/src/parse/`: front matter, секции, варианты (`main`, `fwd`/`rev`, `c1`…`c3`), `contentHash` через Web Crypto.
3. `content-fs/src/repo.ts`: загрузка в `ReadonlyMap<path, text>`, hostname по умолчанию для `device`.
4. Golden-тест разбора в `content-fs`.

## Затронутые файлы

- `fixtures/golden/`
- `packages/core/src/parse/`
- `packages/content-fs/src/repo.ts`

## Правила

`core` без Node API: файлы приходят картой (D3), хэш — Web Crypto (D4). Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Unit разбора и хэша; golden: 3 темы, 30 карточек, варианты по типам.

## Приёмка фазы

- [x] AC-F01a, AC-F01b, AC-F02a–c проходят.
- [x] Lint и тесты зелёные.
