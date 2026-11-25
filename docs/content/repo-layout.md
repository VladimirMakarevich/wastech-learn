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
├── .claude/settings.json              # hook PostToolUse → lint
├── skills-lock.json                   # версии skills из wastech-learn
├── .gitattributes                     # reviews/**/*.jsonl merge=union, eol=lf
└── AGENTS.md / CLAUDE.md              # правила для ИИ в этом репозитории
```

## Именование

| Что | Формат | Пример |
| --- | --- | --- |
| Домен | `kebab-case`, языковой домен — `lang-<iso>` | `high-load`, `lang-pl` |
| Тема | `kebab-case`, на английском, даже если тема на ru или pl | `cqrs`, `w-restauracji` |
| Карточка | `<id>.md`, где `id` — 8 символов Crockford base32 | `7k2m9xqd.md` |
| Диаграмма | `kebab-case.mmd` + `kebab-case.svg` | `outbox-relay.mmd` |
| Журнал | `reviews/<device>/<writer>-YYYY-MM.jsonl` | `reviews/desk1/web-2026-11.jsonl` |

Идентичность темы — путь `<domain>/<topic>`. Переименовать тему можно без потери прогресса: журнал ссылается на review items (`<id>:<variant>`), а не на пути ([ADR-0002](../adr/0002-card-identity-and-review-items.md)).

## `learn.config.json`

Настройки, которые не являются контентом. Схему проверяет `core`.

```jsonc
{
  "device": "desk1",                 // имя устройства; задаётся локально, по умолчанию hostname
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

Поле `device` лучше хранить в локальном `learn.local.json` (в `.gitignore`), чтобы у каждого компьютера было своё значение. Это вопрос [Q-03](../risks-and-questions.md).

## Что коммитится и что нет

| Коммитится | Не коммитится |
| --- | --- |
| `content/**` (включая `.svg`), `inbox/**`, `journal/**`, `reviews/**` | `.cache/**` — производный кэш |
| `learn.config.json`, конфиги mdlint и MCP, skills-lock | `learn.local.json` — локальное устройство |
| `.gitattributes` | Секреты, токены (их в MVP нет) |

## Связь с фреймворком

- Skills ставятся из `wastech-learn/skills/` и фиксируются в `skills-lock.json` (источник и хэш), как в `wastechlab-mobile-template`.
- MCP-сервер и CLI запускаются через `npx` с фиксированной версией пакета.
- Пресет mdlint копируется из `wastech-learn`. В mdlint нет `extends`, поэтому при обновлении пресет нужно синхронизировать вручную (Q-04).

## См. также

- [Файлы темы](topic-files.md) · [Карточки](cards.md) · [Журнал событий](review-log.md)
- [Синхронизация](../architecture/sync.md)
