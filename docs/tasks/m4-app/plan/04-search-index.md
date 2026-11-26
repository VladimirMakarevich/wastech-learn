# Фаза 04 — Индекс поиска в bundle

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** —
- **Даёт:** `searchIndex` в bundle и его загрузка из `core`

## Цель

Поиск в браузере без сервера тем же индексом, что у MCP (design D13, [ADR-0014](../../../adr/0014-search-minisearch.md)).

## Шаги

1. `core/search`: сериализация индекса и функция загрузки с теми же настройками и нормализацией pl.
2. `ContentBundle.searchIndex` — необязательное поле, версия bundle остаётся 1.
3. `content-fs/bundle.ts` кладёт индекс в bundle; снапшот bundle golden обновляется после ревью.

## Затронутые файлы

- `packages/core/src/search/`
- `packages/core/src/bundle/types.ts`
- `packages/content-fs/src/bundle.ts`

## Правила

Снапшоты только для проверенных выходов ([testing](../../../../.rules/testing.md)); `builtAt` по-прежнему передаётся снаружи.

## Тесты

Туда-обратно: загруженный индекс отвечает так же, как построенный; польское слово без диакритики; повторная сборка даёт тот же bundle.

## Приёмка фазы

- [ ] Unit-часть AC-F05 проходит.
- [ ] [components](../../../architecture/components.md): `searchIndex` описан; lint и тесты зелёные.
