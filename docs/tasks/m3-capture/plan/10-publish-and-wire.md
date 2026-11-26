# Фаза 10 — Публикация и подключение контента

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 01–09
- **Даёт:** Пакеты в npm, контент-репозиторий с сервером, hook и skills

## Цель

Сделать захват доступным в настоящем контент-репозитории.

## Шаги

1. Попросить у владельца согласие на публикацию; опубликовать `@wastech-learn/*` точными версиями.
2. В `wastech-learn-content`: devDependencies, `.mcp.json` (D11), `.claude/settings.json` с hook, `npx skills add` трёх skill с `skills-lock.json`.
3. Коммит в контенте отдельно и только после «да».

## Затронутые файлы

- `../wastech-learn-content/.mcp.json`
- `../wastech-learn-content/.claude/settings.json`
- `../wastech-learn-content/skills-lock.json`

## Правила

Публикация — внешнее действие, только с явного согласия. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Ручная проверка AC-F12.

## Приёмка фазы

- [ ] AC-F12 проходит.
- [ ] Lint контента — 0 ошибок.
