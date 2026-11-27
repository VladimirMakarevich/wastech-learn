# Фаза 05 — Синхронизация в приложении

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 03
- **Даёт:** Сервис состояния git, индикатор, панель синхронизации, напоминание на итогах

## Цель

Владелец видит, что не отправлено, и синхронизируется без терминала (AS-F02, AS-F05…AS-F10).

## Шаги

1. `data/git-state.ts`: signal состояния, обновление по `git-changed` и `visibilitychange` (design D11); вызовы в `data/api.ts` с разбором ответов.
2. Оболочка: индикатор вместо `shell.saved`, панель синхронизации (CDK dialog) с «войдёт / не войдёт», полем сообщения, «Синхронизировать» и «Получить», итогом и ошибками.
3. Session end: напоминание по AS-Q4.
4. Ключи i18n ru/en/pl; тексты по [tone-of-voice](../../../../.rules/tone-of-voice.md).

## Затронутые файлы

- `packages/app/src/app/data/{git-state,api}.ts`
- `packages/app/src/app/shell/*`
- `packages/app/src/app/app.{html,ts}`
- `packages/app/src/app/screens/session-end/*`
- `packages/app/src/app/i18n/{ru,en,pl}.ts`
- `packages/app/e2e/git.spec.ts`
- `packages/app/e2e/global-setup.ts`

## Правила

Вид — Evening Glass из [DESIGN.md](../../../../DESIGN.md); компоненты тонкие, логика в чистых модулях.

## Тесты

E2E на копии golden с bare-удалённым: индикатор, панель, синхронизация, получение, напоминание, клавиатура, axe.

## Приёмка фазы

- [ ] E2E-части AC-F02, AC-F05…AC-F10, AC-N01d, AC-N04 для оболочки.
- [ ] Lint, тесты, build и e2e зелёные.
