# Фаза 11 - Документы и закрытие вехи

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 01-10
- **Даёт:** Статусы требований и документы по definition of done, M2 отмечена сделанной

## Цель

Свести документацию с тем, что построено.

## Шаги

1. Статусы FR и NFR по definition of done.
2. `docs/architecture/components.md`: порт `srs`, каталог сообщений и пресет в `core`.
3. `docs/quality/mdlint-policy.md`: где лежит каноничный пресет.
4. `docs/roadmap.md`, `AGENTS.md`, `README.md`: M2 сделана, следующая веха - M3.
5. `index.md` спеки: статус `done`, журнал изменений.

## Затронутые файлы

- `docs/requirements/`
- `docs/architecture/components.md`
- `docs/roadmap.md`
- `AGENTS.md`

## Правила

Документы движутся с кодом; русский в `docs/`, английский в `AGENTS.md` и `.rules/`. Общие правила - [.rules/README.md](../../../../.rules/README.md).

## Тесты

`npm run lint:docs` без ошибок.

## Приёмка фазы

- [x] Все пункты [definition-of-done](../definition-of-done.md) отмечены.
- [x] Lint и тесты зелёные.
