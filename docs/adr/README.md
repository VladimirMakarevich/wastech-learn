# Архитектурные решения (ADR)

Короткие записи о решениях, которые дорого менять. Формат: front matter (`id`, `status`, `date`) и четыре секции: Контекст, Решение, Альтернативы, Последствия. Шаблон — [0000-template.md](0000-template.md).

Принятый ADR не редактируется по существу. Чтобы изменить решение, пишется новый ADR, а у старого ставится `status: superseded`.

| ADR | Решение | Статус |
| --- | --- | --- |
| [0001](0001-two-repositories.md) | Два репозитория: фреймворк и приватный контент | accepted |
| [0002](0002-card-identity-and-review-items.md) | Одна карточка — один файл, стабильный случайный `id`, review item = карточка × вариант | accepted |
| [0003](0003-append-only-review-log.md) | Append-only JSONL для каждого устройства и writer, кэш из replay | accepted |
| [0004](0004-fsrs-via-ts-fsrs.md) | FSRS через зафиксированную версию ts-fsrs, оптимизатор после ~1000 повторений | accepted |
| [0005](0005-four-button-rating.md) | Четыре кнопки оценки с подписями | accepted |
| [0006](0006-headless-core-angular-ui.md) | Headless TS-ядро + desktop-first UI на Angular и CDK | accepted |
| [0007](0007-local-server-phase-1.md) | Фаза 1: локальный Hono-сервер и кэш в `node:sqlite` | accepted |
| [0008](0008-capture-via-subscription-chats.md) | Захват через подписочные чаты: skills, stdio MCP, learning package | accepted |
| [0009](0009-ai-suggests-user-confirms.md) | ИИ предлагает оценку, пользователь подтверждает | accepted |
| [0010](0010-diagrams-as-code.md) | Диаграммы как код: источник + закоммиченный SVG | accepted |
| [0011](0011-language-per-topic.md) | Язык задаётся на тему, ключи секций на английском, без переводов в MVP | accepted |
| [0012](0012-two-tier-validation.md) | Двухуровневая валидация: mdlint + `check` | accepted |
| [0013](0013-cloud-sync-phase-2.md) | Фаза 2: Cloudflare Worker + D1 + Access, git остаётся архивом | rejected |
| [0014](0014-search-minisearch.md) | Поиск: MiniSearch по content bundle | accepted |
| [0015](0015-session-package.md) | Пакет `session` на `core` и `srs`; replay в клиенте без кэша `node:sqlite` | accepted |
| [0016](0016-local-only.md) | Только локальный запуск на компьютере, без облака и мобильной версии | accepted |
| [0017](0017-app-server-writes-and-git.md) | Сервер приложения пишет контент и запускает git | accepted |
