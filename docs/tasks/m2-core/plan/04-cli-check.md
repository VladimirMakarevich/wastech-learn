# Фаза 04 — CLI и команда `check`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 03
- **Даёт:** Бинарь `wastech-learn` с командой `check` и кодами выхода

## Цель

Дать автору первую рабочую команду и задать каркас CLI для остальных.

## Шаги

1. `cli/src/bin.ts`: разбор аргументов (`--content`, `--lang`), маппинг `LearnError.code` → коды `0`/`1`/`2`.
2. `cli/src/check.ts`: загрузка через `content-fs`, вывод находок через каталог сообщений.
3. CLI-тест на временной копии golden.

## Затронутые файлы

- `packages/cli/src/bin.ts`
- `packages/cli/src/check.ts`

## Правила

Хост тонкий: логика только в `core` и `content-fs`. Общие правила — [.rules/README.md](../../../../.rules/README.md).

## Тесты

CLI-тесты кодов выхода в временной папке.

## Приёмка фазы

- [ ] AC-F03a и AC-F01b (код `2`) проходят.
- [ ] `npx wastech-learn check --content fixtures/golden` работает из корня.
