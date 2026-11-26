# Фаза 09 — Skills и промпт экспорта

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 05–07
- **Даёт:** `learn-capture`, `learn-import`, `learn-quiz` и промпт экспорта на трёх языках

## Цель

Описать для ИИ ход захвата, импорта и квиза поверх инструментов.

## Шаги

1. `skills/learn-capture/`, `skills/learn-import/`, `skills/learn-quiz/` по конвенциям `wastech-skills` и [capture](../../../ai/capture.md), правила тьютора из [tutor-and-grading](../../../ai/tutor-and-grading.md).
2. `skills/learn-import/templates/export-prompt.{en,ru,pl}.md` и тест одинаковых требований.
3. Добавить `skills/*/SKILL.md` в корпус mdlint (уже в `include`).

## Затронутые файлы

- `skills/learn-capture/SKILL.md`
- `skills/learn-import/SKILL.md`
- `skills/learn-quiz/SKILL.md`

## Правила

Skills на английском; тон из `.rules/tone-of-voice.md`; ИИ не выдаёт ответ до попытки. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

mdlint корпуса, тест промптов.

## Приёмка фазы

- [x] AC-F07d, AC-F09 проходят.
- [x] Lint и тесты зелёные.
