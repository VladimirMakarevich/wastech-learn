# Definition of done — M4, приложение

[⌂ index](index.md) · критерии — [acceptance-criteria.md](acceptance-criteria.md)

## Базовые ворота проекта

Те же, что в [DoD вехи M2](../m2-core/definition-of-done.md): `npm run lint` и `npm test` зелёные, логика с тестами, комментарии объясняют «почему», точные версии, Conventional Commits без строк об агенте и только после «да» владельца, `/code-review` после каждой фазы. Действуют для каждой фазы плана.

## Ворота этой задачи

- [x] ADR-0015 принят **до** первого кода пакета `session`; в том же изменении обновлены [components](../../architecture/components.md), [.rules/architecture.md](../../../.rules/architecture.md) и границы в `eslint.config.js`. Ни одна граница не ослаблена ради импорта.
- [x] ADR-0015 фиксирует и отказ от кэша `node:sqlite` в M4 (design D6); у [ADR-0007](../../adr/0007-local-server-phase-1.md) в «Последствиях» появляется строка со ссылкой на него, сам ADR не переписывается.
- [x] `npm run lint` покрывает `app`: ESLint с правилами шаблонов Angular, Stylelint для его CSS, Prettier, проверка типов вместе с шаблонами. `npm run build` собирает и приложение; `serve` раздаёт эту сборку.
- [x] `npm test` включает unit-тесты `session`, `server` и чистых модулей `app`. E2E запускаются отдельным скриптом `npm run test:e2e` и отдельным job в CI (Chromium, `permissions: contents: read`); оба зелёные.
- [ ] Все автоматические критерии из [acceptance-criteria.md](acceptance-criteria.md) проходят; ручной AC-N10 выполнен на реальном контенте и записан в журнал изменений спеки.
- [x] Замеры AC-N02 (следующая карточка, видимость правки, replay 50k событий) и время пересборки bundle реального репозитория записаны в журнал изменений спеки; если пересборка дольше 1.5 с — инкрементальная сборка сделана (design D5).
- [x] Новые зависимости (Angular, CDK, Hono, `@hono/node-server`, Playwright, axe) — точные версии, лицензии проверены и перечислены в журнале изменений спеки. Inter лежит в приложении с `OFL.txt`; CDN нет.
- [x] Экраны прошли ревью дизайна по DESIGN.md (skill `impeccable`) в тёмной и светлой темах; замечания исправлены или записаны в questions.md.
- [x] Прототип `prototypes/desktop-ui` не изменён.

## Документы, которые двигаются вместе с кодом

- [x] Статусы → `done`: FR-201…FR-203, FR-205…FR-207, FR-209, FR-211, FR-218, FR-301…FR-305, FR-309, FR-311, FR-312, FR-401…FR-403, FR-501…FR-505, FR-509, NFR-01, NFR-03, NFR-05, NFR-10, NFR-11. → `accepted` с пометкой, что осталось: FR-214 (retire — Later), FR-215 (`r` — Later), NFR-15 (сборка Capacitor — фаза 2).
- [x] [components](../../architecture/components.md): пакет `session`, маршруты `server`, команда `serve`, `searchIndex` в bundle; [data-flows](../../architecture/data-flows.md): пути `/api/*` и SSE.
- [x] [.rules/testing.md](../../../.rules/testing.md): строки `session`, `server`, `app` и уровень e2e; [.rules/README.md](../../../.rules/README.md) и `AGENTS.md`: фаза, команды `serve` и `test:e2e`; `README.md`: запуск приложения.
- [x] [interaction](../../ux/interaction.md): `b` действует до конца сессии, `r` — Later; [screens](../../ux/screens.md): Settings только показывает DR, лимиты и устройство.
- [x] [risks-and-questions](../../risks-and-questions.md): Q-10 и Q-12 закрыты со ссылкой на спеку, Q-11 перенесён на Later, R-11 обновлён по итогам.
- [x] [roadmap](../../roadmap.md): M4 отмечена сделанной с датой; следующая веха — M5.
- [ ] `index.md` спеки: статус `done`, таблица фаз и журнал изменений актуальны.
