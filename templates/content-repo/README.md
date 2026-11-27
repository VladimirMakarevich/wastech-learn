# wastech-learn-content

Приватный репозиторий знаний для [wastech-learn](https://github.com/VladimirMakarevich/wastech-learn): темы, summary, материалы, карточки, диаграммы и журнал повторений. Формат описан в документации фреймворка: [структура](https://github.com/VladimirMakarevich/wastech-learn/blob/main/docs/content/repo-layout.md), [карточки](https://github.com/VladimirMakarevich/wastech-learn/blob/main/docs/content/cards.md), [журнал](https://github.com/VladimirMakarevich/wastech-learn/blob/main/docs/content/review-log.md).

## Структура

```text
content/<domain>/<topic>/   index.md · summary.md · materials.md · cards/<id>.md · diagrams/*.mmd + *.svg
inbox/                      learning packages из ChatGPT и других чатов
journal/                    журнал рефлексии (позже)
reviews/<device>/           append-only журнал повторений (*.jsonl)
learn.config.json           параметры SRS и лимиты
learn.local.json            имя этого компьютера, не коммитится
```

## Команды

Нужен Node ≥24.17 (`.nvmrc`) и собранный фреймворк в соседней папке `../wastech-learn`.

```bash
npm ci
npm run lint              # wastech-mdlint по пресету контента - 0 ошибок перед коммитом
npm run view              # просмотр тем в браузере: схемы, подсветка, граф ссылок
npm run render:diagrams   # diagrams/*.mmd → *.svg с хэшем источника
```

CI (`.github/workflows/content-lint.yml`) на каждый push и pull request запускает `lint`, `wastech-learn check` и проверку свежести диаграмм; фреймворк для `check` он берёт из `VladimirMakarevich/wastech-learn` (ветка `main`, меняется в начале workflow). Правила для ИИ-агентов - в [AGENTS.md](AGENTS.md).
