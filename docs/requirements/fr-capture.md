# FR-1xx: захват темы

Как тема из чата попадает в контент-репозиторий. Детали — в [capture.md](../ai/capture.md) и [mcp-tools.md](../ai/mcp-tools.md).

## Требования

| ID | Требование | Priority | Status | Principles | Journeys |
| --- | --- | --- | --- | --- | --- |
| FR-101 | Skill `learn-capture` в Claude Code или Codex ведёт цикл темы: pre-questions, диалог, brain dump, кандидаты, визуал, запись, мини-квиз | MVP | accepted | LP-06, LP-09 | J-01 |
| FR-102 | Кандидаты карточек показываются пользователю списком. Пользователь отбирает, правит или отклоняет каждого. Выбранные сохраняются как `active`, отложенные — как `draft` | MVP | accepted | LP-06, LP-13 | J-01, J-02 |
| FR-103 | Перед предложением кандидатов выполняется поиск дублей по существующим карточкам и темам; найденные похожие показываются рядом с кандидатом | MVP | accepted | LP-13 | J-01, J-02 |
| FR-104 | В начале захвата задаются 3–5 pre-questions; ответ и уверенность 1–3 сохраняются в `## Pretest` темы | MVP | accepted | LP-16, LP-08 | J-01 |
| FR-105 | Перед генерацией карточек пользователь формулирует суть темы своими словами; ИИ отмечает пробелы и заблуждения; результат идёт в `Key idea` и `TL;DR` | MVP | accepted | LP-01, LP-06, LP-09 | J-01 |
| FR-106 | Захват завершается мини-квизом из 3 новых карточек; ответы пишутся как события `review` (learning step) | MVP | accepted | LP-01, LP-11 | J-01 |
| FR-107 | Stdio MCP-сервер `wastech-learn-mcp` предоставляет инструменты `create_topic`, `add_cards`, `update_card`, `save_summary`, `save_materials`, `save_diagram`, `validate`, `search`, `import_package`, `archive_package` | MVP | done | LP-12 | J-01, J-02 |
| FR-108 | Каждая запись через MCP проходит mdlint и `check`; при ошибках файл не пишется, находки возвращаются ИИ для исправления | MVP | done | LP-13 | J-01, J-02 |
| FR-109 | Hook `PostToolUse` в контент-репозитории запускает lint и `check` для изменённых файлов `content/**` | MVP | accepted | LP-13 | J-01 |
| FR-110 | Универсальный промпт экспорта (ru/en/pl) выдаёт learning package; `learn-import` раскладывает пакет из `inbox/` по файлам темы с отбором карточек | MVP | accepted | LP-06 | J-02 |
| FR-111 | `save_diagram` принимает Mermaid, рендерит SVG, вписывает хэш источника, проверяет синтаксис и alt-текст | MVP | done | LP-12 | J-01 |
| FR-112 | Remote MCP (HTTPS + OAuth) с тем же набором инструментов для claude.ai и ChatGPT developer mode; запись через ветку или PR — вне скоупа, [ADR-0016](../adr/0016-local-only.md) | Later | dropped | LP-06 | J-02 |
| FR-113 | MCP Apps: карточка с кнопками оценки и шкалой уверенности прямо в чате | Later | proposed | LP-01, LP-08 | J-09 |
| FR-114 | Диаграммы D2 и Excalidraw с рендером в SVG | Later | proposed | LP-12 | J-01 |
| FR-115 | У темы есть `familiarity` (`new`/`familiar`); тьютор начинает с worked example или с задачи соответственно | MVP | accepted | LP-14 | J-01 |
| FR-116 | Мутирующие MCP-инструменты идемпотентны по `requestId` и поддерживают `dryRun` | MVP | done | — | J-01, J-09 |
| FR-117 | Квиз-инструменты не раскрывают ответ до попытки: `quiz_next` возвращает только вопрос, ответ отдаёт `reveal` | MVP | done | LP-01, LP-15 | J-09 |

## Критерии приёмки MVP

- Захват одной темы — от «разберём X» до записанных файлов и мини-квиза — занимает ≤15 мин без учёта времени диалога. Результат: summary, materials, ≥1 диаграмма, 5–12 карточек.
- Импорт learning package из ChatGPT проходит без ручного редактирования файлов, кроме отбора карточек.
- После захвата `lint` и `check` возвращают 0 ошибок.

## См. также

- [Требования к повторению](fr-review.md) · [NFR](nfr.md)
