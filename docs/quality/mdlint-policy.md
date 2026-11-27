# Политика качества контента: mdlint + check

Контент проверяется на двух уровнях ([ADR-0012](../adr/0012-two-tier-validation.md)).

1. **wastech-mdlint** — размеры, front matter, секции, ссылки и картинки, заглушки. Работает в редакторе, в hook Claude Code, в MCP `validate` и в CI.
2. **`wastech-learn check`** — то, чего mdlint не умеет или не должен: число слов в вопросе и ответе, число пропусков cloze, уникальность `id` между файлами, свежесть SVG, ссылки карточки на summary.

## Лимиты (SIZE-001)

Для русского и польского текста основная метрика — `bytes`: оценка токенов `chars/4` занижает кириллицу в 2–3 раза.

| Файл | Glob | Строки warn/err | Байты warn/err |
| --- | --- | --- | --- |
| Карточка | `content/**/cards/*.md` | 40 / 60 | 2048 / 3072 |
| Паспорт темы | `content/*/*/index.md` | 60 / 90 | 4096 / 6144 |
| Summary | `content/*/*/summary.md` | 150 / 220 | 12288 / 18432 |
| Материалы | `content/*/*/materials.md` | 120 / 200 | 10240 / 16384 |
| Learning package | `inbox/*.md` | 400 / 600 | 40960 / 61440 |
| Журнал рефлексии | `journal/*.md` | 200 / 300 | 16384 / 24576 |

## Пресет для `wastech-learn-content`

Ключи опций сверены со схемой `@wastech-mdlint/cli@0.4.1`. Ниже — сокращённая версия. Каноничный пресет («версия пресета 1») — файл `packages/core/preset/content.mdlint.jsonc` фреймворка, он поставляется с CLI. Его копия лежит в `wastech-mdlint.config.json` контент-репозитория и 2026-11-25 проверена на golden sample. Расхождение копии ловит `check`: каждое правило пресета (ключ — `rule` или `id` custom-правила) должно быть в копии с теми же опциями и severity, описания могут быть на языке контента. По сравнению с первым черновиком в неё добавлено:

- секция `Pretest` в `index.md`;
- порядок секций summary (SEC-002);
- допустимые `lang` и `langPair` у карточки;
- шаблон для `related` у темы.

Все правила срабатывают на заведомо плохих карточках. Дубль `id` mdlint не ловит, это задача `check`.

```jsonc
{
  "$schema": "./node_modules/@wastech-mdlint/cli/schema.json",
  "include": ["content/**/*.md", "inbox/*.md", "journal/*.md", "./*.md"],
  "rules": [
    { "rule": "FM-001", "options": {
        "files": ["content/**/cards/*.md"],
        "required": ["id", "type", "status", "bloom", "grading", "origin", "created"],
        "allowed": {
          "type": ["basic", "cloze", "reversed", "why", "compare", "scenario", "vocab", "grammar-cloze",
                   "design", "bug", "explain", "occlusion", "draw", "salience"],
          "status": ["draft", "active", "retired"],
          "bloom": ["remember", "understand", "apply", "analyze", "evaluate", "create"],
          "grading": ["self", "ai", "none"],
          "origin": ["claude-code", "codex", "chatgpt", "manual", "import"] },
        "patterns": { "id": "^[0-9a-hjkmnp-tv-z]{8}$", "created": "^\\d{4}-\\d{2}-\\d{2}$",
                      "tags": "^[a-z0-9][a-z0-9-]*$", "idea": "^[a-z0-9][a-z0-9-]*$" } } },
    { "rule": "FM-001", "options": {
        "files": ["content/*/*/index.md"],
        "required": ["title", "domain", "lang", "status", "familiarity", "created", "origin"],
        "allowed": { "lang": ["en", "ru", "pl"], "status": ["draft", "active", "archived"],
                     "familiarity": ["new", "familiar"] } } },
    { "rule": "FM-001", "options": { "files": ["content/*/*/summary.md"], "required": ["status", "updated"] } },
    { "rule": "FM-001", "options": { "files": ["content/*/*/materials.md"], "required": ["updated"] } },

    { "rule": "SEC-001", "options": { "files": ["content/**/cards/*.md"], "sections": ["Question", "Answer"] } },
    { "rule": "SEC-002", "options": { "files": ["content/**/cards/*.md"], "level": 2,
        "order": ["Question", "Answer", "Rubric", "Explanation", "Sources"] } },
    { "rule": "SEC-001", "options": { "files": ["content/*/*/index.md"], "sections": ["Key idea", "Pretest", "Cards"] } },
    { "rule": "SEC-001", "options": { "files": ["content/*/*/summary.md"], "exclude": ["content/lang-*/**"],
        "sections": ["TL;DR", "Mental model", "Diagram", "Worked example", "Trade-offs", "When not to use",
                     "Misconceptions", "Comparison", "Self-check", "Related", "Open questions", "Sources"] } },
    { "rule": "SEC-001", "options": { "files": ["content/lang-*/*/summary.md"],
        "sections": ["TL;DR", "Rules", "Examples", "Exceptions", "Comparison", "Self-check", "Related", "Sources"] } },
    { "rule": "SEC-001", "options": { "files": ["content/*/*/materials.md"], "sections": ["Materials"] } },

    { "rule": "SIZE-001", "options": { "lines": { "warn": 300 }, "overrides": [
        { "pattern": "content/**/cards/*.md", "lines": { "warn": 40, "error": 60 }, "bytes": { "warn": 2048, "error": 3072 } },
        { "pattern": "content/*/*/index.md", "lines": { "warn": 60, "error": 90 }, "bytes": { "warn": 4096, "error": 6144 } },
        { "pattern": "content/*/*/summary.md", "lines": { "warn": 150, "error": 220 }, "bytes": { "warn": 12288, "error": 18432 } },
        { "pattern": "content/*/*/materials.md", "lines": { "warn": 120, "error": 200 }, "bytes": { "warn": 10240, "error": 16384 } },
        { "pattern": "inbox/*.md", "lines": { "warn": 400, "error": 600 }, "bytes": { "warn": 40960, "error": 61440 } } ] } },

    { "rule": "REF-001" }, { "rule": "REF-002" }, { "rule": "REF-003" }, { "rule": "REF-008" },
    { "rule": "CTX-001" }, { "rule": "CTX-005" }, { "rule": "CTX-006" },
    { "rule": "GRP-002", "options": { "files": ["content/**/cards/*.md"] } },
    { "rule": "custom", "id": "LEARN-NO-YESNO", "description": "Вопрос не должен быть да/нет",
      "options": { "files": ["content/**/cards/*.md"],
        "assert": { "kind": "contentNotMatch", "pattern": "## Question\\s+(\\[[^\\]]+\\]\\s*)?(Верно ли|Можно ли|Является ли|Is |Does |Can )" } } },
    { "rule": "custom", "id": "LEARN-NO-TOKENS", "description": "Не осталось незаполненных {{TOKENS}} шаблона",
      "options": { "files": ["content/**/*.md"], "assert": { "kind": "contentNotMatch", "pattern": "\\{\\{[A-Z][A-Z0-9_]*\\}\\}" } } },
    { "rule": "custom", "id": "LEARN-LOCAL-IMAGES", "severity": "warning", "description": "Картинки лежат в репозитории",
      "options": { "files": ["content/**/*.md"], "assert": { "kind": "contentNotMatch", "pattern": "!\\[[^\\]]*\\]\\(https?://" } } }
  ]
}
```

Шаблонные токены пишутся `{{UPPER_CASE}}`, а cloze — `{{c1::…}}` в нижнем регистре. Поэтому `LEARN-NO-TOKENS` не путает одно с другим.

## Правила `wastech-learn check`

| Проверка | Правило | Id находки |
| --- | --- | --- |
| Слова в вопросе | ≤25, у `scenario` ≤60 | `question-words` |
| Слова в ответе | `basic`/`cloze`/`vocab` ≤12; `why`/`compare` ≤40 и ≤3 пунктов | `answer-words`, `answer-points` |
| Рубрика | ≤5 пунктов, хотя бы один отмечен `(!)`; у `scenario` и `design` обязательна | `rubric-items`, `rubric-required`, `rubric-missing` |
| Код | ≤12 строк в блоке, ≤80 символов в строке | `code-lines`, `code-width` |
| Cloze | Каждый вариант `cN` содержит ровно один пропуск, вариантов от 1 до 3, каждый пропуск закрыт `}}` | `cloze-gaps`, `cloze-variants`, `cloze-unclosed` |
| `vocab` | Есть `langPair` и пример предложения курсивом в `Answer` (`*…*`, от двух слов) | `vocab-lang-pair`, `vocab-example` |
| Уникальность | `id` уникален во всём репозитории | `id-unique` |
| Diagram | SVG лежит рядом, `source-sha256` в нём совпадает с хэшем `.mmd` | `diagram-svg-missing`, `diagram-stale` |
| Привязка | В `Sources` карточки есть ссылка на `../summary.md#…` | `summary-link` |
| Правка `active` | Предупреждение, если в Question или Answer изменилось больше 40% слов по сравнению с последним коммитом (Q-05) | `active-edit` |
| Пресет mdlint | Предупреждение, если правило пресета из CLI пропало или изменилось в `wastech-mdlint.config.json`; свои дополнительные правила разрешены | `preset-drift`, `preset-invalid` |

Словами считается то, что читает человек: блоки кода, разметка cloze и одиночные знаки препинания не считаются. Находка называет файл, строку и правило, но не цитирует текст карточки. Ошибки `check` блокируют запись через MCP (`validate`) и падают в CI, предупреждения только показываются.

## Где запускается

| Где | Что |
| --- | --- |
| MCP: каждая запись и `validate` | Корпус mdlint из `@wastech-mdlint/core` с наложенными новыми файлами (`lintContext` по заменённым документам) + `check` до записи |
| Hook Claude Code `PostToolUse` | `wastech-learn hook post-tool-use`: mdlint и `check` по изменённому файлу `content/**` |
| CI контент-репозитория | `lint`, `check` и свежесть SVG на каждый push и pull request; фреймворк для `check` workflow берёт соседним checkout (`FRAMEWORK_REPOSITORY`, `FRAMEWORK_REF`) |
| VS Code | Задача `lint:content`; MCP mdlint доступен ИИ в редакторе |

## См. также

- [Правила формулировки](../learning/card-writing-rules.md) · [Формат карточки](../content/cards.md)
