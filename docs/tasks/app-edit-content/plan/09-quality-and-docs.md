# Фаза 09 — Качество, приёмка и документы

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 06–08
- **Даёт:** Доступность, сеть, бюджет, ревью дизайна, замер, документы

## Цель

Закрыть качества AE-N, ручной замер и сводку документов, после чего спека переходит в `done`.

## Шаги

1. `packages/app/e2e/`: правка карточки, ошибка, исправление и сохранение только с клавиатуры; возврат фокуса; диалоги держат фокус; axe в светлой и тёмной теме; ширина 360 px; аудит сети — только `127.0.0.1`.
2. `npm run build`: бюджет `initial` в `angular.json`; дифф `package.json` без новых зависимостей.
3. Ревью дизайна редактора в Cards, на Topic и на Review по [DESIGN.md](../../../../DESIGN.md) (skill `impeccable`) в обеих темах; замечания исправлены или записаны в [questions.md](../questions.md).
4. Владелец повторяет замер AC-N03 на реальном контенте; медиана — в журнал спеки.
5. Документы: FR-315 → `done`, FR-215 и FR-312 про `e` и `Shift+E` ([fr-content](../../../requirements/fr-content.md), [fr-review](../../../requirements/fr-review.md)); [interaction](../../../ux/interaction.md); [screens](../../../ux/screens.md); [cards](../../../content/cards.md) — правило D5; `index.md` спеки — статус `done`.

## Затронутые файлы

- `packages/app/e2e/`
- `docs/requirements/fr-content.md`, `docs/requirements/fr-review.md`
- `docs/ux/interaction.md`, `docs/ux/screens.md`, `docs/content/cards.md`
- `docs/tasks/app-edit-content/index.md`

## Правила

Документы на русском и в бюджете `SIZE-001`; статусы FR двигаются в том же коммите, что и код ([documentation](../../../../.rules/documentation.md)).

## Тесты

Playwright с `@axe-core/playwright`, аудит сети; `npm run lint` проверяет документы.

## Приёмка фазы

- [ ] AC-N03, AC-N04, AC-N05, AC-N06, AC-F16 проходят; все ворота [definition-of-done.md](../definition-of-done.md) отмечены.
- [ ] `npm run lint`, `npm test`, `npm run build` и `npm run test:e2e` зелёные.
