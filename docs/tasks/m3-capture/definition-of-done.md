# Definition of done - M3, захват

[⌂ index](index.md) · критерии - [acceptance-criteria.md](acceptance-criteria.md)

## Базовые ворота проекта

Те же, что в [DoD вехи M2](../m2-core/definition-of-done.md): `npm run lint` и `npm test` зелёные, логика с тестами, комментарии объясняют «почему», точные версии, Conventional Commits без строк об агенте и только после «да» владельца, `/code-review` после каждой фазы. Действуют для каждой фазы плана.

## Ворота этой задачи

- [x] Все автоматические критерии из [acceptance-criteria.md](acceptance-criteria.md) проходят (сквозной рендер AC-F05 с настоящим mermaid-cli не запускался).
- [x] У каждого инструмента есть контрактный тест на временной копии golden (AC-N05).
- [x] Контент работает на локальной сборке через `file:`-ссылки; публикация `@wastech-learn/*` в npm и переход на точные версии - отдельным решением после приёмки (M3-Q9).
- [x] Контент-репозиторий подключён: `.mcp.json`, `.claude/settings.json` с hook, три skill с `skills-lock.json`; изменения закоммичены в `wastech-learn-content` отдельно.
- [ ] Ручная приёмка выполнена и записана в журнал изменений спеки: одна реальная тема захвачена из Claude Code (AC-N06, время), одна импортирована из ChatGPT; `lint` и `check` контента - 0 ошибок.

## Документы, которые двигаются вместе с кодом

- [ ] Статусы: FR-101…FR-111, FR-115…FR-117, FR-210 → `done`; FR-205 и FR-211 → `accepted` (в вебе - M4).
- [x] [mcp-tools](../../ai/mcp-tools.md): `archive_package`, коды ошибок `PATH_OUTSIDE_CONTENT`, `REQUEST_ID_REUSED`, `ITEM_NOT_ACTIVE`.
- [x] [capture](../../ai/capture.md): `.mcp.json` с `npx --no-install`, hook через `wastech-learn hook post-tool-use`.
- [x] [learning-package](../../ai/learning-package.md): шаг `archive_package` вместо переноса внутри импорта, путь к промптам на трёх языках.
- [x] [components](../../architecture/components.md): `serialize`, `search`, транзакция и хранилище `requestId`.
- [ ] [roadmap](../../roadmap.md): M3 отмечена сделанной с датой; `AGENTS.md` и `README.md` называют следующую веху.
- [ ] `index.md` спеки: статус `done`, таблица фаз и журнал изменений актуальны.
