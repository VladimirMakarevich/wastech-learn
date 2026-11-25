---
id: ADR-0008
status: accepted
date: 2026-11-25
---

# ADR-0008: Захват через подписочные чаты — skills, stdio MCP, learning package

## Контекст

Темы разбираются в Claude Code (основной чат), ChatGPT и других. Пользователь работает только по подпискам, API-ключей нет. Без ключей приложение не может само вызвать модель. Remote MCP для claude.ai и ChatGPT требует публичного HTTPS и OAuth.

## Решение

- **Claude Code (MVP):** skills `learn-capture`, `learn-import` и `learn-quiz` плюс stdio MCP `wastech-learn-mcp` и MCP `wastech-mdlint`, hook `PostToolUse` для lint. Вся работа ИИ идёт внутри сессии Claude Code по подписке.
- **ChatGPT и прочие (MVP):** промпт экспорта → один MD-файл в формате learning package → `inbox/` → `learn-import` в Claude Code.
- **Remote MCP (Later):** тот же набор инструментов на Cloudflare Worker — для claude.ai web/mobile и ChatGPT developer mode.

## Альтернативы

- **Приложение вызывает Claude API.** Нужен ключ, это противоречит решению пользователя.
- **Remote MCP сразу.** Нужны хостинг, OAuth и запись в git через PR — слишком много для MVP.
- **Только копипаст.** Нет валидации и отбора карточек, захват медленный.

## Последствия

- Захват из ChatGPT — двухшаговый: экспорт там, импорт в Claude Code.
- Расход лимитов подписки нужно беречь: короткие ответы инструментов, батчи в квизе.
- Skills и MCP версионируются вместе с ядром.
