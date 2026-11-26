# Фаза 07 — Каркас приложения

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 06
- **Даёт:** Пакет `app` на Angular 22, сборка, lint, раздача сервером, Playwright и job в CI

## Цель

Пустое, но настоящее приложение, которое собирается, проходит lint, раздаётся `serve` и проверяется e2e (design D8, D14).

## Шаги

1. `packages/app`: Angular 22 точной версии, standalone, zoneless, `@angular/build`; маршруты экранов-заглушек; сборка в `dist/browser`.
2. Корневые скрипты: `build` собирает и `app`, `app:dev` — dev-сервер Angular с прокси `/api` на `serve`. `server` по умолчанию раздаёт сборку `app` и не импортирует его код.
3. Lint: angular-eslint для TS и шаблонов, Stylelint и Prettier на файлы `app`, проверка типов с шаблонами в `typecheck`.
4. Playwright: конфиг, глобальная подготовка (копия golden, журнал-фикстура из `srs` с сидом, `serve --no-open --port 0`), аудит сети, скрипт `test:e2e`, job в CI только с Chromium и `permissions: contents: read`.

## Затронутые файлы

- `packages/app/`
- `package.json`, `eslint.config.js`, `tsconfig.json`
- `playwright.config.ts`, `.github/workflows/ci.yml`

## Правила

Без Material, Ionic, NgModules и zone.js ([ADR-0006](../../../adr/0006-headless-core-angular-ui.md)); `app` импортирует только `core`, `srs`, `session`; все скрипты рабочие ([.rules/README.md](../../../../.rules/README.md)).

## Тесты

E2E-дымовой: главная открывается, ни одного запроса не к `127.0.0.1`.

## Приёмка фазы

- [x] `npm run lint`, `npm run build`, `npm test` и `npm run test:e2e` зелёные локально и в CI.
- [x] Лицензии Angular, angular-eslint и Playwright в журнале спеки.
