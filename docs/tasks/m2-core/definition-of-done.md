# Definition of done — M2, ядро

[⌂ index](index.md) · критерии — [acceptance-criteria.md](acceptance-criteria.md)

## Базовые ворота проекта

Из раздела «Before committing (DoD)» в [.rules/git-workflow.md](../../../.rules/git-workflow.md); действуют для каждой фазы плана, а не только для последней.

- [ ] `npm run lint` зелёный: ESLint, Stylelint, Prettier, `tsc -b`, wastech-mdlint.
- [ ] `npm test` зелёный. Скрипт появляется в первой фазе вместе с Vitest и fast-check, и в той же фазе шаг `npm test` добавляется в `.github/workflows/ci.yml`.
- [ ] Новая логика покрыта тестами нужного уровня ([testing](../../../.rules/testing.md)); тесты детерминированы: `now`, сид и `tz` заданы явно.
- [ ] Комментарии объясняют «почему», без ссылок; нет `TODO` без причины и условия.
- [ ] Зависимости с точными версиями, lockfile закоммичен.
- [ ] Затронутая область оставлена лучше, чем была, или долг назван.
- [ ] Коммиты в стиле Conventional Commits на английском, только явные пути, без строк об агенте; коммит — только после «да» владельца.
- [ ] После реализации фазы — `/code-review` через subagents, как требует skill `implement`.

## Ворота этой задачи

- [ ] Все критерии из [acceptance-criteria.md](acceptance-criteria.md) проходят, кроме явно помеченных как ручные.
- [ ] `check` на golden даёт 0 ошибок; найденные в golden настоящие ошибки исправлены в `wastech-learn-content` отдельным коммитом там.
- [ ] `simulate` подтверждает критерий MVP: 14 дней перерыва разбираются сессиями по 15 минут не дольше 5 дней. Итог сравнения порядков записан, Q-01 закрыт в [risks-and-questions](../../risks-and-questions.md), порядок по умолчанию в [backlog](../../scheduling/backlog.md) совпадает с итогом.
- [ ] Бенчмарк NFR-05 для replay и `build` проходит на машине разработчика; результат записан в журнал изменений спеки.
- [ ] Границы пакетов не ослаблены: `eslint.config.js` не менялся ради импорта.

## Документы, которые двигаются вместе с кодом

- [ ] Статусы требований: FR-204, FR-208, FR-307, NFR-04, NFR-14 → `done`; FR-201, FR-206, FR-207, FR-211, NFR-05 → `accepted` (логика в ядре, интерфейс и запись событий — в M3 и M4).
- [ ] [components](../../architecture/components.md): порт `ReplayEvent` и `QueueCard` в `srs`, каталог сообщений и пресет в `core`.
- [ ] [mdlint-policy](../../quality/mdlint-policy.md): где лежит каноничный пресет.
- [ ] [.rules/testing.md](../../../.rules/testing.md): раздел «Current state» описывает тесты, которые есть.
- [ ] [roadmap](../../roadmap.md): M2 отмечена сделанной с датой; `AGENTS.md` и `README.md` называют следующую веху.
- [ ] `index.md` спеки: статус `done`, таблица фаз и журнал изменений актуальны.
