# Контент-репозиторий `wastech-learn-content`

Это приватный репозиторий со знаниями и историей повторений. Фреймворк (`wastech-learn`) его только читает и дописывает. Почему данные отделены от кода, объясняет [ADR-0001](../adr/0001-two-repositories.md).

## Структура

```text
wastech-learn-content/
├── content/
│   ├── architecture/                  # домен
│   │   └── backpressure/              # тема
│   │       ├── index.md               # паспорт темы + список карточек
│   │       ├── summary.md             # summary по шаблону из 12 секций
│   │       ├── materials.md           # материалы для углубления
│   │       ├── cards/
│   │       │   ├── 7k2m9xqd.md        # одна карточка = один файл
│   │       │   └── h3p8w1zr.md
│   │       └── diagrams/
│   │           ├── flow.mmd           # источник диаграммы
│   │           └── flow.svg           # отрендеренная версия (коммитится)
│   ├── dotnet/ …
│   ├── angular/ …
│   └── lang-pl/                       # языковой домен
│       └── w-restauracji/
│           ├── index.md
│           ├── summary.md             # шаблон для языковых тем
│           ├── cards/ …
│           └── audio/                 # Later: офлайн-озвучка (Piper)
├── inbox/                             # learning packages из ChatGPT и других чатов
├── journal/                           # Later: журнал рефлексии, YYYY-MM.md
├── reviews/                           # журнал событий (append-only)
│   └── <device>/<writer>-YYYY-MM.jsonl
├── .cache/                            # производный кэш (node:sqlite), в .gitignore
├── learn.config.json                  # параметры SRS, лимиты, устройство, языки
├── wastech-mdlint.config.json         # пресет из wastech-learn
├── .mcp.json                          # подключение wastech-learn-mcp и wastech-mdlint MCP
├── .claude/settings.json              # hook PostToolUse → wastech-learn hook post-tool-use
├── skills-lock.json                   # версии skills из wastech-learn
├── .gitattributes                     # reviews/**/*.jsonl merge=union, eol=lf
└── AGENTS.md / CLAUDE.md              # правила для ИИ в этом репозитории
```

## Именование

| Что | Формат | Пример |
| --- | --- | --- |
| Домен | `kebab-case`, языковой домен - `lang-<iso>` | `high-load`, `lang-pl` |
| Тема | `kebab-case`, на английском, даже если тема на ru или pl | `cqrs`, `w-restauracji` |
| Карточка | `<id>.md`, где `id` - 8 символов Crockford base32 | `7k2m9xqd.md` |
| Диаграмма | `kebab-case.mmd` + `kebab-case.svg` | `outbox-relay.mmd` |
| Журнал | `reviews/<device>/<writer>-YYYY-MM.jsonl` | `reviews/desk1/web-2026-11.jsonl` |

Идентичность темы - путь `<domain>/<topic>`. Переименовать тему можно без потери прогресса: журнал ссылается на review items (`<id>:<variant>`), а не на пути ([ADR-0002](../adr/0002-card-identity-and-review-items.md)).

## `learn.config.json`

Настройки, которые не являются контентом. Схему проверяет `core`.

```jsonc
{
  "timezone": "Europe/Warsaw",       // IANA-зона для границы дня
  "dayStartsAt": "04:00",
  "uiLanguage": "ru",                // ru | en | pl
  "srs": {
    "scheduler": "ts-fsrs@6.0.1",    // точная версия, см. ADR-0004
    "model": "FSRS-7",
    "desiredRetention": 0.9,
    "maxIntervalDays": 365,
    "learningSteps": ["1m", "10m"],
    "relearningSteps": ["10m"],
    "allowModelOverride": true,      // модель может удлинить шаг (FSRS-7)
    "graduatingIntervalDays": 1,
    "fuzz": true,                    // детерминированный: сид cardId + reps
    "weights": null                  // null = веса по умолчанию до оптимизации
  },
  "limits": {
    "default": { "newPerDay": 10, "reviewsPerDay": 150 },
    "lang-pl": { "newPerDay": 10, "reviewsPerDay": 150 },
    "sessionMinutes": 15,
    "pauseNewWhenBacklogOver": 2.0   // множитель от reviewsPerDay
  },
  "leechThreshold": 8
}
```

Имя устройства лежит не здесь, а в локальном `learn.local.json` (в `.gitignore`): `{ "device": "desk1" }`. У каждого компьютера своё значение, без файла берётся hostname. Иначе два компьютера писали бы в один файл `reviews/<device>/`.

## Что коммитится и что нет

| Коммитится | Не коммитится |
| --- | --- |
| `content/**` (включая `.svg`), `inbox/**`, `journal/**`, `reviews/**` | `.cache/**` - производный кэш |
| `learn.config.json`, конфиги mdlint и MCP, skills-lock | `learn.local.json` - локальное устройство |
| `.gitattributes` | Секреты, токены (их в MVP нет) |

## Связь с фреймворком

- Skills ставятся из `wastech-learn/skills/` командой `wastech-learn init` и фиксируются в `skills-lock.json` (источник и хэш), как в `wastechlab-mobile-template`. Остальная инфраструктура берётся из шаблона `templates/content-repo/` фреймворка; `wastech-learn doctor` показывает файлы, которые от него отличаются.
- MCP-сервер и CLI запускаются через `npx` с фиксированной версией пакета.
- Пресет mdlint копируется из `wastech-learn`: в mdlint нет `extends`. Каноничный пресет поставляется с CLI, и `check` предупреждает, если в копии правило пресета пропало или изменилось ([mdlint-policy](../quality/mdlint-policy.md)).

## См. также

- [Файлы темы](topic-files.md) · [Карточки](cards.md) · [Журнал событий](review-log.md)
- [Синхронизация](../architecture/sync.md)
