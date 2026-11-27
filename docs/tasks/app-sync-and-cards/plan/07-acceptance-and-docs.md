# Фаза 07 — Приёмка и документы

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 06
- **Даёт:** Замер, ревью дизайна, ручная приёмка на реальном контенте, документы и статусы

## Цель

Закрыть задачу на настоящих данных и свести документы.

## Шаги

1. Замер AC-N03 на реальном `wastech-learn-content`.
2. Ревью экранов по DESIGN.md (skill `impeccable`) в обеих темах.
3. Ручная приёмка: синхронизация с `desk1`, получение на втором компьютере, архив и возврат карточки; `check` — 0 ошибок.
4. Документы по [definition-of-done](../definition-of-done.md): architecture, screens, interaction, cards, статусы FR.

## Затронутые файлы

- `docs/architecture/{components,data-flows,sync}.md`
- `docs/ux/{screens,interaction}.md`
- `docs/content/cards.md`
- `docs/requirements/{fr-review,fr-content}.md`
- `docs/tasks/app-sync-and-cards/*`

## Правила

Документы на русском, правила на английском ([documentation](../../../../.rules/documentation.md)); не выдумывать замеры.

## Тесты

`npm run lint` с `lint:docs`; ручная приёмка.

## Приёмка фазы

- [ ] Ручная приёмка и замер записаны в журнал спеки.
- [ ] Все пункты definition of done отмечены.
