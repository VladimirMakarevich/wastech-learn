# Фаза 05 - Компилятор bundle и `build`

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☑
- **Зависит от:** 04
- **Даёт:** Content bundle по контракту без `searchIndex`, команда `build`

## Цель

Собрать то, что в M4 будет читать UI, тем же конвейером, что задуман в прототипе.

## Шаги

1. `core/src/bundle/`: remark → GFM → rehype → Shiki (две темы) → KaTeX → встроенные SVG → `rehype-sanitize`; `builtAt` параметром.
2. `cli/src/build.ts`: запись bundle в выходной путь; при ошибке схемы файл не пишется.
3. Golden-снимок bundle.

## Затронутые файлы

- `packages/core/src/bundle/`
- `packages/cli/src/build.ts`

## Правила

HTML только из своего контента и через санитайзер; вывод повторяем. Общие правила - [.rules/README.md](../../../../.rules/README.md).

## Тесты

Golden-снимок, unit санитайзера, CLI-тест ошибки схемы, время сборки golden.

## Приёмка фазы

- [x] AC-F04a-c проходят; `build` golden < 10 с.
- [x] Lint и тесты зелёные.
