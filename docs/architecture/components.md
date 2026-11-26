# Компоненты и контракты

Монорепозиторий `wastech-learn` на npm workspaces, как в `wastech-mdlint`. Требуется Node ≥24.17. Принцип headless core: вся логика в четырёх пакетах, хосты только связывают их с вводом-выводом.

## Пакеты

| Пакет | Ответственность | Зависит от | Где работает |
| --- | --- | --- | --- |
| `@wastech-learn/core` | Zod-схемы (front matter, `learn.config.json`, событие, learning package, входы инструментов MCP), парсер Markdown (unified/remark — тот же стек, что в mdlint), сериализация файлов контента из полей (`serialize/`), поиск MiniSearch (`search/`), генераторы `id` и ULID с внешним RNG, компилятор content bundle (remark → rehype → Shiki, KaTeX, sanitize), правила `check`, каталог сообщений ru/en/pl, каноничный пресет mdlint `preset/content.mdlint.jsonc` | unified, remark, rehype, zod, yaml, shiki, minisearch | Node, браузер |
| `@wastech-learn/srs` | Адаптер ts-fsrs, replay журнала, очередь (лимиты, siblings, бэклог, режим «5 минут»), симуляция бэклога, метрики | ts-fsrs | Node, браузер |
| `@wastech-learn/session` | Сессия повторения поверх `core` и `srs` ([ADR-0015](../adr/0015-session-package.md)): перевод значений `core` в порты `srs`, сборка событий (`review`, `undo`, `suspend`, `unsuspend`, `reset`), правило leech, прогноз интервалов четырёх кнопок, журнал в памяти с replay по одному review item, движок сессии (режимы, learning steps в ходе сессии, отмена, bury, suspend, reset, внешние изменения), подсказка оценки по рубрике и итоги | core, srs | Node, браузер |
| `@wastech-learn/content-fs` | Чтение репозитория и снимок по времени изменения файлов, проверка с наложением (mdlint + `check`), транзакция записи группы файлов, хранилище `requestId`, запись тем, карточек, summary, materials и диаграмм, `inbox/`, квиз (replay в памяти, дозапись событий `mcp` через `session`), дозапись JSONL (атомарно, свой файл на writer), рендер Mermaid | core, srs, session, `@wastech-mdlint/core`; mermaid-cli через `npx` с точной версией, не зависимостью | Node |
| `@wastech-learn/cli` | `check`, `build`, `render`, `simulate` (M2), `new-id`, `hook post-tool-use` (M3); `serve`, `export` — позже | core, srs, content-fs | Node |
| `@wastech-learn/mcp-server` | `wastech-learn-mcp`: инструменты MCP ([mcp-tools](../ai/mcp-tools.md)) поверх `content-fs`, маппинг ошибок в `{ code, message, hint }` | core, srs, content-fs, `@modelcontextprotocol/sdk` | Node (stdio; позже Worker) |
| `@wastech-learn/server` | Локальный HTTP: bundle, события, статус, SSE об изменениях | core, srs, content-fs, Hono | Node |
| `app` | Angular + CDK UI | core (типы bundle), srs и session (replay, очередь и сессия в клиенте) | Браузер, Capacitor |
| `skills/*` | [`learn-capture`](../../skills/learn-capture/SKILL.md), [`learn-import`](../../skills/learn-import/SKILL.md), [`learn-quiz`](../../skills/learn-quiz/SKILL.md) | — (инструкции над MCP и CLI) | Claude Code |

## Правила зависимостей

```mermaid
flowchart BT
  core["core"]
  srs["srs"]
  ses["session"]
  cfs["content-fs"]
  cli["cli"]
  mcp["mcp-server"]
  srv["server"]
  app["app"]
  ses --> core
  ses --> srs
  cfs --> ses
  cli --> cfs
  mcp --> cfs
  srv --> cfs
  app --> ses
```

- `core` и `srs` не зависят друг от друга, от Node API и от файловой системы, поэтому работают в браузере.
- `session` соединяет `core` и `srs` и тоже работает в браузере: логика ответа на карточку, нужная и квизу MCP, и приложению, живёт здесь, а не в хосте.
- Хосты не содержат бизнес-логики. Новая логика попадает в `core`, `srs`, `session` или `content-fs`, как в `wastech-mdlint`, где `core` владеет всем конвейером.
- `app` никогда не импортирует `content-fs`. Состояние он получает только через `ReviewStore`.

## Контракты

**`ReviewStore`** — единственный способ UI работать с событиями ([ADR-0006](../adr/0006-headless-core-angular-ui.md)):

```ts
interface ReviewStore {
  loadEvents(): Promise<ReviewEvent[]>;          // весь журнал (или с последнего снапшота)
  append(events: ReviewEvent[]): Promise<void>;  // идемпотентно по event.id
  onExternalChange(cb: () => void): Unsubscribe; // git pull, другой writer
}
// Фаза 1: HttpReviewStore → local server → reviews/<device>/web-YYYY-MM.jsonl
// Фаза 2: SqliteOutboxReviewStore → Capacitor SQLite + синхронизация с Worker/D1
```

**Порты `srs`.** `srs` не импортирует `core`, поэтому объявляет узкие входы: `ReplayEvent` (`id`, `ts`, `kind`, `item`, `rating`, `target`, `due`), `QueueCard` (`item`, `cardId`, `idea`, `domain`, `type`, `status`) и `SrsConfig`. Хост передаёт разобранные значения `core`; совместимость форм проверяет `satisfies` в `session/ports.ts`, поэтому переименование поля ломает сборку, а не replay.

**Путь записи MCP** — в `content-fs`: инструмент строит полные тексты файлов (`core/serialize`), `validateOverlay` прогоняет mdlint и `check` по репозиторию с наложенными файлами, `commitFiles` пишет группу атомарно с откатом, `runIdempotent` хранит ответы по `requestId` в `.cache/mcp/requests.jsonl`. Пути проходят `confinePath` после разрешения символических ссылок.

**Content bundle** — результат `wastech-learn build`, его читает UI:

```ts
interface ContentBundle {
  version: 1;
  builtAt: string;          // передаётся снаружи: повторная сборка даёт тот же файл
  domains: DomainMeta[];
  topics: TopicMeta[];      // путь, title, lang, familiarity, related, html секций summary
  cards: CardEntry[];       // id, type, created, variants[], questionHtml, answerHtml, rubric[], contentHash, topic
  assets: Record<string, string>; // локальные картинки, которые не встроены; SVG встраиваются в HTML
  searchIndex?: unknown;    // сериализованный MiniSearch из core/search, попадёт в bundle в M4
}
```

Пропуски cloze в HTML — `<span class="cloze" data-cloze="N">`: UI скрывает пропуск показываемого варианта.

**Grader** — подключаемая оценка открытых ответов ([tutor-and-grading](../ai/tutor-and-grading.md)): `grade(question, rubric, answer) → { verdicts[], suggestedRating, explanation }`. Реализации: `chat` (сам ИИ в чате, MVP), `claude-cli` и `api` (Later).

## Безопасность рендера

HTML в bundle создаётся только компилятором из собственного контента и проходит `rehype-sanitize` со списком разрешённых тегов (SVG, KaTeX, классы Shiki). UI вставляет его без повторной санитизации, поэтому чужой HTML в bundle не допускается.

## См. также

- [Обзор](overview.md) · [Потоки данных](data-flows.md) · [Журнал событий](../content/review-log.md)
