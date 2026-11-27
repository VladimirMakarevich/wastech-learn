# Исследование: технический стек

Отдельное исследование стека, которое просил пользователь. Итоговое решение - в [overview.md](../architecture/overview.md) и [ADR-0006](../adr/0006-headless-core-angular-ui.md).

## Варианты архитектуры приложения

| | (a) Static + IndexedDB | (b) SPA + локальный backend | (c) Angular + .NET | (d) Плагин Obsidian | (e) PWA |
| --- | --- | --- | --- | --- | --- |
| Расширяемость | высокая | высокая | высокая | ограничена API | слой поверх |
| Простота | максимальная | средняя | ниже: два рантайма | высокая на старте | + service worker |
| Телефон | да | нет без хостинга | если хостить | да | да |
| Офлайн | да | да (десктоп) | зависит | да | да |
| Синхронизация | только export/import | git с десктопа | сервер | Obsidian Sync / obsidian-git | нужен backend |
| Стоимость | $0 (Pages) | $0 (localhost) | VPS | Sync ≈$4-5/мес | - |
| TS-экосистема (mdlint, ts-fsrs) | нативно | нативно | FSRS в клиенте | нативно | - |

Факты, которые повлияли на выбор:

- GitHub Pages для приватного репозитория закрывается только на Enterprise Cloud.
- Cloudflare Zero Trust (Access) бесплатен до 50 пользователей.
- iOS может стереть хранилище, доступное скриптам, после 7 дней без визитов.
- obsidian-git на телефоне работает через isomorphic-git без SSH, есть падения.
- В Obsidian около 19 плагинов с FSRS. Spaced Repetition - около 603 тыс. загрузок.

**Итог.** Исследование стека рекомендовало (a) + (e) с переходом к (b): Astro, content collections, island для повторения, Hono для журнала. Архитектурное ревью предложило headless core + Angular/Ionic из `wastechlab-mobile-template`: один UI для веба и Capacitor, готовые i18n ru/pl и офлайн SQLite. После кликабельного прототипа принят desktop-first Angular + CDK без Ionic: вид задаёт своя дизайн-система, из шаблона берётся i18n, Capacitor - в фазе 2. Ionic-шаблон и Astro описаны в ADR-0006 как альтернативы. Фаза 1 - localhost + Hono ([ADR-0007](../adr/0007-local-server-phase-1.md)).

## Рендеринг Markdown

- Конвейер: `remark-parse` → `remark-gfm` → `remark-frontmatter` → `remark-math` → `remark-rehype` → `rehype-katex` → Shiki → `rehype-sanitize`.
- unified выбран, потому что это **тот же парсер, что в wastech-mdlint**: то, что проверено, совпадает с тем, что показано. markdown-it проще, но общего AST нет.
- Front matter в mdlint читается как строки (failsafe YAML). В ядре даты приводятся через Zod.

## Диаграммы как код

| Формат | ИИ пишет | Headless-рендер | Зависимости |
| --- | --- | --- | --- |
| Mermaid | Надёжнее всего | `mmdc -i a.mmd -o a.svg` | Puppeteer (Chromium) |
| D2 | Хорошие раскладки | `d2 a.d2 a.svg` | Go-бинарник |
| PlantUML | Текст | Java или Kroki | JVM |
| Excalidraw | Многословный JSON | `excalidraw-to-svg` (JSDOM) или Playwright | Node и браузер |
| Kroki | - | Один HTTP API на 30+ форматов | Docker |

Решение: источник + закоммиченный SVG с хэшем источника; Mermaid в MVP ([ADR-0010](../adr/0010-diagrams-as-code.md)).

## Поиск

| Библиотека | Плюсы | Минусы |
| --- | --- | --- |
| Pagefind | Индекс при сборке, грузится по частям (100-300 KB) | Публичный индекс, неудобен на Node |
| Orama | Полный движок, поля-массивы | Избыточен для корпуса в тысячи карточек |
| MiniSearch | Простой, работает в браузере и на Node | Индексы крупнее |
| FlexSearch | Быстрый | Низкоуровневый |

Решение: MiniSearch по content bundle ([ADR-0014](../adr/0014-search-minisearch.md)).

## Синхронизация

- **Журнал как поток событий.** Состояние = replay. Файл на каждый writer + `merge=union` на всякий случай.
- **Cloudflare D1 (бесплатно):** 5 млн чтений и 100 тыс. записей строк в день, 500 MB на базу.
- **Supabase Free** засыпает через неделю неактивности. **Turso sync:** офлайн-записи в бете, нет разрешения конфликтов.
- Решение: git в фазе 1, Worker + D1 + outbox в фазе 2 ([sync](../architecture/sync.md)).

## ts-fsrs 6 - риски

Вышел 2026-10-28, затем 6.0.1 - 2026-11-22. Ломающие изменения:

- модель по умолчанию - FSRS-7;
- требуется Node ≥24;
- `Rating` и `State` стали frozen-объектами;
- изменилась генерация случайных чисел для fuzz.

**[вывод]** Фиксировать точную версию и писать версию планировщика в каждое событие.

## Источники

- <https://github.com/open-spaced-repetition/ts-fsrs> · <https://docs.astro.build/en/guides/content-collections/>
- <https://github.com/remcohaszing/rehype-mermaid> · <https://d2lang.com/tour/exports/> · <https://github.com/yuzutech/kroki>
- <https://github.com/JRJurman/excalidraw-to-svg> · <https://www.pkgpulse.com/guides/marked-vs-remark-vs-markdown-it-parsers-2026>
- <https://developers.cloudflare.com/d1/platform/pricing/> · <https://www.cloudflare.com/plans/sase-zero-trust.md>
- <https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/about-privately-published-github-pages-sites>
- <https://webkit.org/?p=14403> · <https://supabase.com/docs/guides/platform/free-project-pausing>
- <https://docs.turso.tech/features/embedded-replicas> · <https://github.com/vinzent03/obsidian-git>
- <https://evilmartians.com/chronicles/how-to-add-fast-client-side-search-to-astro-static-sites>
