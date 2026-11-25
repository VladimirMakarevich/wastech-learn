# wastech-learn

Персональный фреймворк обучения. Любую тему разбираешь в ИИ-чате, например в Claude Code или ChatGPT: архитектура, high-load, паттерны, Angular, .NET, польский язык. Потом тема превращается в четыре вещи:

- **карточки** интервального повторения: забытое показывается чаще, запомненное реже (FSRS, как в Anki);
- **summary** темы по единому шаблону: суть, ментальная модель, схема, пример, trade-offs;
- **материалы** для углубления;
- **визуальные разборы**: архитектурные схемы, таблицы сравнения, карты понятий, аннотированный код.

Методика опирается на книгу «Запомнить всё» (Make It Stick: Brown, Roediger, McDaniel) и другие доказательные практики: retrieval practice, интервалы, чередование, калибровку. Все данные — Markdown, SVG и JSONL в git. Размер карточек и документов держит в рамках [wastech-mdlint](https://github.com/VladimirMakarevich/wastech-mdlint).

## Статус

**Фаза 0 — документация.** Кода пока нет. Требования, методика, модель данных и архитектура описаны в [docs/](docs/README.md). План фаз — в [roadmap](docs/roadmap.md).

## Два репозитория

| Репозиторий | Что внутри | Доступ |
| --- | --- | --- |
| `wastech-learn` (этот) | Документация, ядро и приложение, CLI, MCP-сервер, skills, шаблоны, пресет mdlint | Можно открыть |
| `wastech-learn-content` | Темы, карточки, summary, материалы, диаграммы, логи повторений | Приватный |

Почему так, объясняет [ADR-0001](docs/adr/0001-two-repositories.md). Устройство контент-репозитория описано в [content/repo-layout.md](docs/content/repo-layout.md).

## Как это работает (кратко)

![Happy path: разбор темы в чате, короткие сессии повторения по FSRS, углубление; данные в приватном git](docs/assets/happy-path/01-overview.svg)

Ещё две схемы — день 0 и сессия повторения — на странице [happy path](docs/product/happy-path.md).

## С чего начать чтение

1. [Happy path на схемах](docs/product/happy-path.md)
2. [Видение и цели](docs/product/vision.md)
3. [Сценарии пользователя](docs/product/journeys.md)
4. [Принципы обучения](docs/learning/principles.md)
5. [Карта всей документации](docs/README.md)

## Прототип UI

[Кликабельный прототип десктопного интерфейса](prototypes/desktop-ui/README.md) на данных golden sample: главная, сессия повторения, темы, карточки, статистика, настройки. Открывается как `prototypes/desktop-ui/index.html`.

## Проверка и просмотр документации

Нужен Node ≥24.17 (`.nvmrc`). Пакеты `@wastech-mdlint/*` 0.4.1 стоят в devDependencies: `core`, `cli`, `mcp-server`, `viewer`.

```bash
npm ci
npm run lint:docs      # проверка документации (0 ошибок — условие готовности)
npm run docs:view      # локальный просмотр на 127.0.0.1:4180: схемы, подсветка, граф ссылок
npm run docs:graph     # граф связей документов
```

Конфиг лежит в [wastech-mdlint.config.json](wastech-mdlint.config.json), правила для агентов — в [AGENTS.md](AGENTS.md). Ту же проверку на каждый push и pull request запускает CI: `.github/workflows/markdown-lint.yml`.

## Лицензия

[MIT](LICENSE). Лицензия распространяется на этот репозиторий: документацию, прототип и будущий код. Контент-репозиторий `wastech-learn-content` приватный, лицензия на него не действует.
