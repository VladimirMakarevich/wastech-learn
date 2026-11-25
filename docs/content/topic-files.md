# Файлы темы

Тема — это папка `content/<domain>/<topic>/`. В ней три обязательных файла (`index.md`, `summary.md`, `materials.md`) и папки `cards/` и `diagrams/`. Front matter проверяется FM-001, секции — SEC-001 и SEC-002 ([mdlint-policy](../quality/mdlint-policy.md)). Заголовки секций — фиксированные английские ключи на любом языке темы. UI показывает их в переводе.

## `index.md` — паспорт темы

```yaml
---
title: Backpressure
domain: architecture
lang: en               # en | ru | pl — язык контента темы
status: active         # draft | active | archived
familiarity: new       # new | familiar — влияет на поведение тьютора (LP-14)
created: 2026-11-25
origin: claude-code    # claude-code | chatgpt | manual | import
tags: [streaming, reliability]
related: [architecture/rate-limiting, dotnet/channels]
---
```

| Секция | Содержание |
| --- | --- |
| `## Key idea` | Суть в одном предложении, своими словами (из brain dump) |
| `## Pretest` | 3–5 pre-questions с первым ответом и уверенностью. Потом можно сравнить с итоговым пониманием |
| `## Cards` | Ссылки на карточки: `- [Короткий заголовок](cards/7k2m9xqd.md)`. Список ведут инструменты |

Лимит — 60/90 строк. Список карточек нужен, чтобы ориентироваться в VS Code и чтобы GRP-002 находил карточки, не привязанные к теме.

## `summary.md` — справочник по теме

Summary нужен для чтения и углубления, а не для заучивания. Вспоминание идёт через карточки (LP-01). Front matter: `status`, `updated`.

**Шаблон технической темы — 12 секций по порядку:**

| # | Секция | Что писать | Принцип |
| --- | --- | --- | --- |
| 1 | `## TL;DR` | Суть в 1–2 предложениях | LP-09 |
| 2 | `## Mental model` | Аналогия + как это устроено | LP-09 |
| 3 | `## Diagram` | Ссылка на SVG из `diagrams/` + 1–2 строки, что видно на схеме | LP-12 |
| 4 | `## Worked example` | Конкретный пример на стеке пользователя, аннотированный код | LP-14 |
| 5 | `## Trade-offs` | Плюсы, минусы, цена | LP-05 |
| 6 | `## When not to use` | Границы применимости | LP-05 |
| 7 | `## Misconceptions` | Типичные ошибки и заблуждения | LP-08 |
| 8 | `## Comparison` | Таблица сравнения с похожими подходами | LP-12 |
| 9 | `## Self-check` | 3–5 вопросов; в UI скрыты, пока их не раскроешь (Cornell) | LP-01 |
| 10 | `## Related` | Ссылки на связанные темы | LP-05 |
| 11 | `## Open questions` | Что осталось непонятным, куда копать | LP-07 |
| 12 | `## Sources` | Откуда знание, версия и дата | — |

**Шаблон языковой темы** (`content/lang-*/`): `TL;DR`, `Rules`, `Examples`, `Exceptions`, `Comparison`, `Self-check`, `Related`, `Sources`.

Лимит — 150/220 строк, 12/18 KB. Если summary перерос лимит, тема слишком широкая: её делят на две темы и связывают через `related`. При повторном визите summary уплотняют (progressive summarization), а не наращивают.

## `materials.md` — материалы для углубления

Front matter: `updated`. Одна секция `## Materials` с таблицей:

| Колонка | Значение |
| --- | --- |
| `Title` | Название со ссылкой |
| `Kind` | `docs`, `article`, `video`, `book`, `repo`, `course`, `chat` |
| `Why` | Зачем читать, одна строка |
| `Status` | `to-read`, `read`, `reference` |

Ссылки на чаты (`Kind: chat`) хранятся только если чат доступен по ссылке. Текст чата в репозиторий не копируется.

## Диаграммы

- Источник — `diagrams/<name>.mmd` (Mermaid, MVP). Позже добавятся `.d2` и `.excalidraw`.
- Рядом лежит отрендеренный `diagrams/<name>.svg`. Внутри SVG есть комментарий `<!-- source-sha256: … -->`. `check` сверяет его с хэшем источника и ловит устаревший рендер.
- В Markdown вставляется SVG: `![Поток backpressure: producer → buffer → consumer](diagrams/flow.svg)`. Alt-текст обязателен (CTX-005), ссылка проверяется REF-003.
- Почему SVG коммитится, а не рендерится на лету: его видно в GitHub, VS Code и Obsidian без сборки ([ADR-0010](../adr/0010-diagrams-as-code.md)).

Правила наглядности и виды визуала — в [visuals.md](visuals.md).

## См. также

- [Карточки](cards.md) · [Структура репозитория](repo-layout.md)
