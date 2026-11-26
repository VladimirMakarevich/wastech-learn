# Захват темы из ИИ-чатов

Как разговор в чате превращается в файлы темы. Ограничение пользователя: **только подписки, без API-ключей**. Поэтому вся работа ИИ идёт внутри самих чатов. Решение — [ADR-0008](../adr/0008-capture-via-subscription-chats.md).

## Каналы по клиентам

| Клиент | Механизм | Фаза |
| --- | --- | --- |
| Claude Code (CLI, Desktop Code) | Skills `learn-capture`/`learn-import`/`learn-quiz` + stdio MCP `wastech-learn-mcp` + MCP `wastech-mdlint` + hook | MVP |
| ChatGPT, Gemini и другие без MCP | Промпт экспорта → один MD-файл [learning package](learning-package.md) → `inbox/` → `learn-import` в Claude Code | MVP |
| Claude Desktop (чат) | Тот же stdio MCP через `claude_desktop_config.json` | Later |
| claude.ai web/mobile, ChatGPT developer mode | Remote MCP (HTTPS + OAuth) на Cloudflare Worker ([ADR-0013](../adr/0013-cloud-sync-phase-2.md)) | Later |
| Любой клиент с MCP Apps | Карточка с кнопками оценки прямо в чате | Later |

## Skills (MVP)

Skills лежат в `wastech-learn/skills/<name>/SKILL.md` и ставятся в контент-репозиторий с фиксацией в `skills-lock.json`. Оформлены по конвенциям `wastech-skills`:

- `name` и длинный `description` со словами «Use when…» и русскими триггерами («разберём тему», «сделай карточки»);
- секции: шаги, «Done when», «What not to do»;
- шаблоны в `templates/` с токенами `{{TOKEN}}`;
- `compatibility` с версиями пакетов.

| Skill | Триггер | Что делает | Done when |
| --- | --- | --- | --- |
| [`learn-capture`](../../skills/learn-capture/SKILL.md) | «разберём тему X», «сохрани тему» | Ведёт цикл [study-process](../learning/study-process.md): pre-questions → диалог → brain dump → кандидаты → визуал → запись → мини-квиз | Файлы темы записаны, `validate` чистый, мини-квиз пройден |
| [`learn-import`](../../skills/learn-import/SKILL.md) | «импортируй из inbox», файл в `inbox/` | Разбирает learning package, показывает кандидатов на отбор, раскладывает по файлам, валидирует, переносит пакет через `archive_package` | Пакет разложен, исходник перемещён в `inbox/done/` |
| [`learn-quiz`](../../skills/learn-quiz/SKILL.md) | «погоняй меня», «квиз 10 минут» | Квиз по due review items с самооценкой или ИИ-оценкой | Батч пройден, события записаны |
| `learn-fix` | «починим leech» | Разбор fix list | Later |
| `learn-journal` | «рефлексия» | Три вопроса рефлексии → `journal/YYYY-MM.md` | Later |

## Ход `learn-capture`

1. Определить домен, тему, `lang` и `familiarity`. Через `search` проверить, нет ли такой темы. Если есть — дополнять её, а не создавать вторую.
2. **Pre-questions:** 3–5 вопросов, к каждому ответ и уверенность. Ответы сохраняются в `## Pretest`.
3. **Диалог** по правилам [тьютора](tutor-and-grading.md).
4. **Brain dump:** пользователь формулирует TL;DR и ментальную модель. ИИ отмечает пробелы.
5. **Кандидаты:** `search` по дублям → 8–15 кандидатов разных типов → `add_cards` с `dryRun: true` (валидация) → пользователь отбирает и правит → `add_cards` без `dryRun`.
6. **Summary, материалы, визуал:** `save_summary`, `save_materials`, `save_diagram`.
7. **Мини-квиз:** 3 только что созданные карточки через `quiz_next` и `record_review`.
8. Короткий итог: что создано, сколько карточек, сколько времени займёт первое повторение.

## Hook и проверки

`.claude/settings.json` контент-репозитория содержит hook `PostToolUse` на `Write|Edit`. Он запускает одну команду, `wastech-learn hook post-tool-use`: она читает JSON события Claude Code из stdin, пропускает файлы вне `content/**` и проверяет изменённый файл mdlint и `check` по всему репозиторию. В ответ попадают ошибки самого файла и ошибки, которые правка вызвала в других файлах по сравнению с закоммиченным состоянием (например, переименованный заголовок summary ломает якорь в карточке). Ошибки уходят в stderr с кодом `2`, и Claude Code возвращает их агенту; чистый файл и файл вне `content/` дают `0`, а событие или командная строка, которые не удалось прочитать, — `1` (видно человеку, агента не останавливает). Для правки `.mmd` проверяется и SVG рядом: устаревший рендер — тоже находка. MCP-инструменты валидируют и сами, а hook подстраховывает ручные правки, которые ИИ делает через Edit.

```jsonc
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "npx --no-install wastech-learn hook post-tool-use --content \"$CLAUDE_PROJECT_DIR\"" }] }
    ]
  }
}
```

## Конфигурация Claude Code в контент-репозитории

Пакеты `@wastech-learn/mcp-server`, `@wastech-learn/cli` и `@wastech-mdlint/mcp-server` стоят в контенте точными devDependencies, поэтому версию фиксирует lockfile, а запуск не ходит в сеть:

```jsonc
// .mcp.json
{
  "mcpServers": {
    "wastech-learn": { "command": "npx", "args": ["--no-install", "wastech-learn-mcp", "--content", "."] },
    "wastech-mdlint": { "command": "npx", "args": ["--no-install", "wastech-mdlint-mcp"] }
  }
}
```

## Риски

- Лимиты подписки: длинный захват и квиз тратят сообщения. Поэтому квиз идёт батчами по 5–10 карточек, а тексты инструментов короткие (R-04).
- Доступность MCP в ChatGPT зависит от плана, документация противоречива. Поэтому базовый путь для ChatGPT — learning package (R-05).

## См. также

- [Learning package](learning-package.md) · [MCP-инструменты](mcp-tools.md) · [Тьютор и оценка](tutor-and-grading.md)
- [Требования FR-1xx](../requirements/fr-capture.md)
