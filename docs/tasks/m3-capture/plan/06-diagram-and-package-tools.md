# Фаза 06 — Диаграммы и learning package

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 05, M2 10
- **Даёт:** `save_diagram`, `import_package`, `archive_package`

## Цель

Закрыть визуал при захвате и путь из ChatGPT.

## Шаги

1. `save_diagram` через `render` M2 с проверкой синтаксиса и `alt`.
2. `package-tools.ts`: `import_package` без побочных эффектов, `archive_package` с `requestId` (D7).

## Затронутые файлы

- `packages/mcp-server/src/content-tools.ts`
- `packages/mcp-server/src/package-tools.ts`

## Правила

Chromium не в зависимостях; рендерер подменяется в тестах. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

Контракт с подставным рендерером; сквозной — при `WASTECH_RENDER_E2E=1`.

## Приёмка фазы

- [ ] AC-F05, AC-F07a, AC-F07c проходят.
- [ ] Lint и тесты зелёные.
