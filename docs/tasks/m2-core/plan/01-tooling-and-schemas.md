# Фаза 01 - Инструменты и схемы

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** -
- **Даёт:** Workspaces `packages/*`, Vitest, fast-check, `npm test` в CI; Zod-схемы конфигурации, front matter и события v1 в `core`

## Цель

Заложить пакеты и тестовый контур, а первой настоящей логикой сделать схемы: на них стоит всё остальное.

## Шаги

1. Создать `packages/core`, `packages/srs`, `packages/content-fs`, `packages/cli` с `package.json` (имена `@wastech-learn/*`, `exports`, `files`), `tsconfig.json` и ссылками в корневом `tsconfig.json`.
2. Поставить Vitest и fast-check точными версиями, добавить `npm test` в корень и шаг в `.github/workflows/ci.yml`.
3. `core/src/errors.ts`: `LearnError` с устойчивым `code`.
4. `core/src/schema/`: `learn.config.json` (с ключами Q-02), `learn.local.json`, front matter темы и карточки, событие v1 с допуском незнакомых необязательных полей.
5. Обновить раздел «Current state» в `.rules/testing.md`.

## Затронутые файлы

- `package.json`
- `tsconfig.json`
- `.github/workflows/ci.yml`
- `packages/core/src/schema/`
- `packages/core/src/errors.ts`

## Правила

Схемы - единственное описание форм; без `any`, enum и default export; точные версии. Общие правила - [.rules/README.md](../../../../.rules/README.md).

## Тесты

Unit на каждую схему: валидный и невалидный вход, путь к полю в ошибке.

## Приёмка фазы

- [x] AC-F01b (часть схемы), AC-N05 проходят.
- [x] `npm run lint` и `npm test` зелёные локально и в CI.
