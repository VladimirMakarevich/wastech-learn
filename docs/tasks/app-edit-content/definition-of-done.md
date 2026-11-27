# Definition of done — приложение: правка тем и карточек в браузере

[⌂ index](index.md) · критерии — [acceptance-criteria.md](acceptance-criteria.md)

## Базовые ворота проекта

Те же, что в [DoD вехи M2](../m2-core/definition-of-done.md): `npm run lint` и `npm test` зелёные, логика с тестами, тесты детерминированы, комментарии объясняют «почему», точные версии, Conventional Commits на английском без строк об агенте и только после «да» владельца, `/code-review` после каждой фазы. Приложение меняется, поэтому `npm run build` и `npm run test:e2e` тоже зелёные. Ворота действуют для каждой фазы плана.

## Ворота этой задачи

- [ ] ADR-0017 (общий с [app-sync-and-cards](../app-sync-and-cards/index.md), design D14) принят **до** первого кода записи в `server` и покрывает правку через `/api/source`. У [ADR-0007](../../adr/0007-local-server-phase-1.md) — датированная строка в «Последствиях», сам ADR не переписан.
- [ ] Вынос `write/successor.ts` из `updateCard` — отдельный коммит `refactor:` без изменения поведения: тесты `update_card` зелёные до и после.
- [ ] Все автоматические критерии из [acceptance-criteria.md](acceptance-criteria.md) проходят; новые сценарии входят в `npm run test:e2e`.
- [ ] Замер AC-N03 на реальном контент-репозитории выполнил владелец; медиана записана в журнал изменений спеки.
- [ ] Ни в одном `package.json` нет новых зависимостей (AE-N06); бюджет `initial` в `angular.json` не превышен.
- [ ] Границы пакетов не ослаблены: `eslint.config.js` не менялся ради импорта; `core` без Node API.
- [ ] Тесты работают на копиях: `fixtures/golden` после `npm test` и `npm run test:e2e` не изменён (`git status` чистый).
- [ ] Редактор в Cards, на Topic и на Review прошёл ревью дизайна по [DESIGN.md](../../../DESIGN.md) (skill `impeccable`) в тёмной и светлой темах; замечания исправлены или записаны в [questions.md](questions.md).
- [ ] Прототип `prototypes/desktop-ui` не изменён.

## Документы, которые двигаются вместе с кодом

- [ ] [fr-content](../../requirements/fr-content.md): новое FR-315 «Правка темы и карточки в приложении с проверкой до записи» — `accepted`, когда план согласован, `done` в последней фазе; FR-312 — VS Code открывается по `Shift+E`. [fr-review](../../requirements/fr-review.md): FR-215 — `e` правит в приложении, `Shift+E` открывает VS Code.
- [ ] [interaction](../../ux/interaction.md): клавиши `e` и `Shift+E`; [screens](../../ux/screens.md): редактор на Topic, в Cards и на Review.
- [ ] [components](../../architecture/components.md): `core/edit`, `content-fs/write/source`, маршруты `/api/source` и `Workspace` в `server`, `app/edit`; [data-flows](../../architecture/data-flows.md): поток правки в приложении.
- [ ] [cards](../../content/cards.md): правило «пропал вариант у active-карточки — решить, та же она или новая» (design D5) рядом с правилом о смене смысла.
- [ ] [.rules/security.md](../../../.rules/security.md) и [.rules/architecture.md](../../../.rules/architecture.md): локальный сервер пишет Markdown только через `content-fs` с проверкой и только в файлы тем и карточек из bundle.
- [ ] `index.md` спеки: статус `done`, журнал изменений актуален.
