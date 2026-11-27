# Журнал событий повторения

Состояние повторений не хранится в Markdown. Оно вычисляется из **append-only журнала событий**. Решение принято в [ADR-0003](../adr/0003-append-only-review-log.md), синхронизация описана в [sync.md](../architecture/sync.md).

## Файлы

- Путь: `reviews/<device>/<writer>-YYYY-MM.jsonl`, одна строка - одно событие.
- `device` - компьютер или телефон (`desk1`, `laptop`, `phone`). `writer` - процесс: `web`, `mcp`, `cli`.
- Каждый writer дописывает только свой файл. Поэтому git-merge не даёт конфликтов. Исключение MVP: две сессии Claude Code на одном устройстве запускают два MCP-сервера с одним writer `mcp`; каждая строка дописывается целиком, дубли отсекаются по `id`, а `undo_last` отменяет последнюю оценку устройства.
- Строки никогда не меняются и не удаляются. Отмена - это новое событие `undo`.
- Около 250 байт на событие: при 50 повторениях в день журнал растёт примерно на 4.5 MB в год.

## Схема события (v1)

```json
{
  "v": 1,
  "id": "01JDX4Q8Z7M2K9V3N5R6T8W1YA",
  "ts": "2026-11-25T18:04:05.123Z",
  "tz": "Europe/Warsaw",
  "device": "desk1",
  "writer": "web",
  "kind": "review",
  "item": "7k2m9xqd:main",
  "rating": 3,
  "aiSuggested": null,
  "grader": "self",
  "confidence": 2,
  "durMs": 8400,
  "contentHash": "sha256:9f2c…",
  "sched": "ts-fsrs@6.0.1/FSRS-7"
}
```

| Поле | Тип | Смысл |
| --- | --- | --- |
| `v` | int | Версия схемы события |
| `id` | ULID | Уникальный id события; по нему отсекаются дубли |
| `ts` | ISO-8601 UTC | Время события |
| `tz` | IANA | Часовой пояс устройства; нужен для границы дня и оптимизатора |
| `device`, `writer` | string | Источник |
| `kind` | enum | `review`, `practice`, `reset`, `suspend`, `unsuspend`, `undo`, `manual_due` |
| `item` | string | `<cardId>:<variant>` |
| `rating` | 1-4 | Again, Hard, Good, Easy (для `review`/`practice`) |
| `aiSuggested` | 1-4 / null | Оценка, предложенная ИИ, если была |
| `grader` | string | `self` или `ai:<client>` (например, `ai:claude-code`) |
| `confidence` | 1-3 / null | Уверенность до показа ответа (LP-08) |
| `durMs` | int | Время ответа, обрезается сверху на 120 000 |
| `contentHash` | string | Хэш секций Question и Answer в момент события |
| `sched` | string | Версия планировщика и модели |
| `target` | ULID | Для `undo`: id отменяемого события |
| `due` | ISO-8601 | Для `manual_due`: новая дата |

## Виды событий

| `kind` | Влияет на расписание | Когда |
| --- | --- | --- |
| `review` | да | Обычное повторение, в том числе learning steps и мини-квиз |
| `practice` | нет | Cram, тренировка по теме без влияния на расписание |
| `reset` | да | Пользователь сбросил прогресс после смены смысла (аналог Forget в Anki) |
| `suspend` / `unsuspend` | да | Исключить из очереди или вернуть (в том числе автоматически для leech) |
| `undo` | да | Отмена события `target` |
| `manual_due` | да | Ручной перенос даты (редко) |

## Replay

1. Собрать все `reviews/**/*.jsonl`, отбросить дубли по `id`, отсортировать по `ts`, при равенстве - по `id`.
2. Применить `undo`: исключить события, на которые ссылается `target`.
3. Для каждого review item прогнать `review`, `reset`, `suspend`, `unsuspend` и `manual_due` через планировщик версии из `learn.config.json`.
4. Результат - кэш состояний (S, D, R, due, lapses, state) в `.cache/` (`node:sqlite`). Кэш можно удалить в любой момент.

Детерминизм: одинаковый журнал и одинаковая версия планировщика дают побайтно одинаковый кэш. Fuzz в ts-fsrs 6 детерминирован (NFR-04). Смена модели или весов - это просто новый replay, историю переписывать не нужно.

## Экспорт для оптимизатора

| Событие | CSV fsrs-optimizer |
| --- | --- |
| `item` | `card_id` |
| `ts` (мс UTC) | `review_time` |
| `rating` | `review_rating` |
| состояние до события (из replay) | `review_state` |
| `durMs` | `review_duration` |

В обучение идут только события `review`. Типы `practice` и `manual_due` исключаются, так же Anki поступает с Manual и Rescheduled. Таймзона и `dayStartsAt` передаются оптимизатору отдельно.

## Изменения схемы

- Новые необязательные поля добавляются без смены `v`.
- Переименование или смена смысла поля - это `v: 2`. Читатель обязан понимать все версии.
- Старые строки не переписываются никогда.

## См. также

- [Планирование SRS](../scheduling/srs.md) · [Метрики](../scheduling/metrics.md) · [Компоненты](../architecture/components.md)
