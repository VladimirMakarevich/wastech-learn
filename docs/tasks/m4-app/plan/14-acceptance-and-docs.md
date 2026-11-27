# Фаза 14 - Приёмка и документы

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑ - AC-N10 принят 2026-11-27
- **Зависит от:** 13
- **Даёт:** Ручная приёмка на реальном контенте, статусы, документы

## Цель

Закрыть веху: критерий roadmap на настоящих данных и документы, которые двигаются вместе с кодом.

## Шаги

1. `wastech-learn serve --content ../wastech-learn-content`: сессия из 20 review items только с клавиатуры; оценки в `reviews/<device>/web-*.jsonl`; `check` - 0 ошибок; итог и дата в журнале спеки (AC-N10).
2. Статусы FR и NFR по [definition-of-done.md](../definition-of-done.md).
3. [.rules/testing.md](../../../../.rules/testing.md), [.rules/README.md](../../../../.rules/README.md), `AGENTS.md`, `README.md`: фаза, команды `serve` и `test:e2e`.
4. [interaction](../../../ux/interaction.md), [screens](../../../ux/screens.md), [risks-and-questions](../../../risks-and-questions.md) (Q-10, Q-11, Q-12, R-11), [roadmap](../../../roadmap.md).
5. `index.md` спеки: статус `done`, журнал изменений.

## Затронутые файлы

- `docs/requirements/*.md`, `docs/ux/*.md`, `docs/roadmap.md`, `docs/risks-and-questions.md`
- `.rules/`, `AGENTS.md`, `README.md`
- `docs/tasks/m4-app/`

## Правила

Документы на русском, правила на английском ([documentation](../../../../.rules/documentation.md)); оценки в контенте коммитит владелец отдельно в `wastech-learn-content`.

## Тесты

`npm run lint` с `lint:docs`; ручная приёмка.

## Приёмка фазы

- [x] AC-N10 выполнен и записан.
- [x] Все пункты [definition-of-done.md](../definition-of-done.md) отмечены.
