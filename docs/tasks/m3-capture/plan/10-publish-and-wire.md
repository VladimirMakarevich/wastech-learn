# Фаза 10 — Подключение контента к локальной сборке

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 01–09
- **Даёт:** Контент-репозиторий на локальной сборке фреймворка: сервер, hook и skills; публикация в npm — после приёмки

## Цель

Сделать захват доступным в настоящем контент-репозитории, не публикуя пакеты: сначала всё проверяется на локальной сборке (M3-Q9).

## Шаги

1. Собрать фреймворк: `npm run build`.
2. В `wastech-learn-content`: devDependencies `@wastech-learn/mcp-server` и `@wastech-learn/cli` как `file:../wastech-learn/packages/<имя>`, `npm install`.
3. `.mcp.json` с сервером (D11) и `.claude/settings.json` с hook `wastech-learn hook post-tool-use --content "$CLAUDE_PROJECT_DIR"` — в том виде, в каком они останутся после публикации.
4. Skills `learn-capture`, `learn-import`, `learn-quiz` из `skills/` фреймворка с фиксацией в `skills-lock.json`.
5. Проверить AC-F12. Правка во фреймворке становится видна после `npm run build` и перезапуска сессии Claude Code.
6. Коммит в контенте отдельно и только после «да».
7. Публикация в npm и переход на точные версии — отдельным решением после приёмки фазы 11; перед ней `npm pack` и проверка на чистой установке.

## Затронутые файлы

- `../wastech-learn-content/package.json`
- `../wastech-learn-content/.mcp.json`
- `../wastech-learn-content/.claude/settings.json`
- `../wastech-learn-content/skills-lock.json`

## Правила

Публикация — внешнее необратимое действие, только с явного согласия. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Ручная проверка AC-F12.

## Приёмка фазы

- [x] AC-F12 проходит на локальной сборке.
- [x] Lint контента — 0 ошибок.
