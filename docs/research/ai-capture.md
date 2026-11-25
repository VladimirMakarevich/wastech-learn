# Исследование: захват контента из ИИ-чатов

Как переносить разобранные темы из чатов в репозиторий при ограничении «только подписки, без API-ключей». Решение — [ADR-0008](../adr/0008-capture-via-subscription-chats.md).

## Возможности клиентов (ноябрь 2026)

| Клиент | Механизм | Ограничения |
| --- | --- | --- |
| Claude Code (CLI, Desktop) | Skills (`.claude/skills/<name>/SKILL.md`, slash-команды теперь тоже skills), stdio MCP в `.mcp.json`, hooks (`PostToolUse`, `Stop`), subagents, plugins | Нет |
| Claude Desktop (чат) | Локальный MCP через `claude_desktop_config.json` или `.mcpb` (установка в один клик) | Только локально |
| claude.ai web и mobile | Custom connector = remote MCP: публичный HTTPS на 443, OAuth или без входа. На Free — один коннектор | Нужен хостинг |
| Claude Code с телефона | Облачные сессии во вкладке Code работают с GitHub-репозиторием | Нужен GitHub-репозиторий |
| Skills в claude.ai | Загрузка ZIP (Pro+, нужен code execution) | Записи в репозиторий нет, только файлы на скачивание |
| ChatGPT | Developer mode: полный MCP с записью (SSE и streamable HTTP, OAuth или без), записи требуют подтверждения | Доступность по тарифам в документации противоречива |
| Прочие чаты | Экспорт или вставка текста | Только вручную |

## Вывод для MVP

- **Claude Code** — основной канал: skills и stdio MCP работают по подписке без ключей.
- **ChatGPT и прочие** — learning package: один MD-файл → `inbox/` → `learn-import`. Работает в любом чате.
- **Remote MCP** — фаза 2: один Worker обслуживает и claude.ai, и ChatGPT.
- **MCP Apps** (официальное расширение с 2026-01-26, ресурсы `ui://` в sandboxed iframe) — Claude, ChatGPT и VS Code умеют показывать интерактивную карточку прямо в чате. Позже это даст квиз с кнопками на телефоне.

## wastech-mdlint как часть захвата

- `@wastech-mdlint/mcp-server` работает только по stdio и даёт 6 read-only инструментов (`lint`, `lint-files`, `context-graph`, …).
- `lint` проверяет строку Markdown по явному набору правил: так ИИ проверяет черновик карточки до записи.
- `lintContent` и `lintFiles` экспортируются из `@wastech-mdlint/core`. Поэтому наш MCP-сервер (и будущий remote на Worker) вызывает их напрямую.
- `wastech-mdlint graph --format mermaid` рисует граф связей тем — заготовка для карты знаний.

## ИИ в процессе повторения

- **Проверка свободного ответа:** вопрос, эталон, ответ и рубрика → вердикты по пунктам, предложенная оценка, разбор. Финальную оценку подтверждает пользователь.
- **Подсказки** выдаются по одной ступени (H0–H4).
- **Перефразирование вопроса**, чтобы не заучивать формулировку (Later). Каноническая формулировка остаётся в файле.

**Оценка затрат, если когда-нибудь появится API-ключ** (цены Anthropic на 2026-11-03; **[вывод]** ~800 входных и ~250 выходных токенов на проверку, 100 проверок в день, без thinking-токенов):

| Модель | $/MTok вход / выход | ≈ в месяц |
| --- | --- | --- |
| Haiku 5.5 | 0.10 / 0.50 | ≈ $0.6 |
| Sonnet 5.5 | 2 / 10 | ≈ $12 |
| Opus 5.5 | 4 / 20 | ≈ $25 |

Ключ хранится только на сервере, например в секретах Worker. Текст карточек и ответов уходит в API — условия хранения данных нужно проверить заранее.

## Конвенции skills пользователя (`wastech-skills`)

- Папка `skills/<name>/SKILL.md`, при необходимости `templates/` с `{{TOKENS}}`.
- Front matter: `name`, длинный `description` с «Use when…» и русскими триггерами. Для команд, которые вызывает только пользователь, — `disable-model-invocation: true`. Указываются `compatibility` (версия CLI) и `metadata`.
- Тело: режимы → «Where X lives» → шаги → «Done when» → «What not to do».
- Правила: говорить на языке пользователя, не коммитить без согласия, вычищать секреты.

## Источники

- <https://code.claude.com/docs/en/skills> · <https://code.claude.com/docs/en/hooks> · <https://code.claude.com/docs/en/claude-code-on-the-web>
- <https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp>
- <https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop>
- <https://www.anthropic.com/engineering/desktop-extensions> · <https://support.claude.com/en/articles/12512198-creating-custom-skills>
- <https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/>
- <https://developers.openai.com/api/docs/guides/developer-mode> · <https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-connectors>
- wastech-mdlint: README и `docs/guide/mcp-server.md` в репозитории пользователя
