# Архитектура: обзор

Система local-first. Вся логика сосредоточена в headless TypeScript-ядре, хосты над ним тонкие. Источник истины — git-репозиторий контента. Ключевые решения: [ADR-0006](../adr/0006-headless-core-angular-ui.md) (ядро + UI), [ADR-0007](../adr/0007-local-server-phase-1.md) (локальный сервер), [ADR-0003](../adr/0003-append-only-review-log.md) (журнал), [ADR-0015](../adr/0015-session-package.md) (пакет `session`, replay в клиенте).

## Контекст (C4, уровень 1)

```mermaid
flowchart TB
  user(["Пользователь<br/>senior dev, один"])
  subgraph chats["ИИ-чаты по подписке"]
    cc["Claude Code"]
    gpt["ChatGPT и другие"]
  end
  wl["wastech-learn<br/>система обучения"]
  repo[("wastech-learn-content<br/>приватный git")]
  vscode["VS Code"]
  mdlint["wastech-mdlint"]
  user -->|разбирает темы| chats
  user -->|повторяет, читает| wl
  user -->|правит контент| vscode
  cc -->|skills + MCP| wl
  gpt -->|learning package через inbox| repo
  wl -->|читает и дописывает| repo
  wl -->|валидирует контент| mdlint
  vscode --> repo
```

## Контейнеры (C4, уровень 2), фаза 1

```mermaid
flowchart LR
  subgraph desktop["Десктоп пользователя"]
    cc["Claude Code<br/>skills learn-*"]
    mcp["wastech-learn-mcp<br/>stdio"]
    mdmcp["wastech-mdlint MCP<br/>stdio"]
    cli["wastech-learn CLI<br/>check / build / render"]
    server["Local server<br/>Hono, localhost"]
    app["App<br/>Angular + CDK в браузере"]
    repo[("content repo<br/>MD, SVG, JSONL")]
  end
  cc --> mcp
  cc --> mdmcp
  mcp -->|core, srs, content-fs| repo
  cli --> repo
  server -->|content bundle, события| app
  app -->|POST events| server
  server --> repo
```

| Контейнер | Ответственность | Технология |
| --- | --- | --- |
| App | Повторение, чтение тем, поиск, статистика, настройки, i18n; replay, очередь и метрики считает сам | Angular + CDK, вид Evening Glass, i18n из `wastechlab-mobile-template`, `session` и `srs` в клиенте |
| Local server | Отдаёт content bundle и журнал, принимает события и дописывает JSONL, следит за файлами, пересобирает bundle | Node 24 + Hono |
| wastech-learn-mcp | Инструменты захвата и квиза для Claude Code | Node 24, `@modelcontextprotocol/sdk`, stdio |
| CLI | `check`, `build` (bundle), `render` (диаграммы), `export` (CSV оптимизатора), `simulate` | Node 24 |
| Content repo | Источник истины: контент и журнал | git, Markdown, SVG, JSONL |

## Фазы развёртывания

| Фаза | Где работает | Синхронизация | Для чего |
| --- | --- | --- | --- |
| 1 (MVP) | Localhost: `npx wastech-learn serve --content <path>` открывает браузер | git push/pull вручную, журнал разделён по device и writer | Десктоп, один или несколько компьютеров |
| 2 | Вне скоупа: облако и телефон не делаются ([ADR-0016](../adr/0016-local-only.md)) | — | — |
| 3 | Как в фазе 1 | Как в фазе 1 | Оптимизатор, калибровка, MCP Apps, Piper |

Подробности синхронизации — в [sync.md](sync.md). Облако и телефон вне скоупа — [ADR-0016](../adr/0016-local-only.md).

## Ключевые качества

- **Headless.** UI не знает про файлы и git, он работает через `ReviewStore` и content bundle. Поэтому UI не зависит от того, где лежат файлы.
- **Детерминизм.** Состояние = replay(журнал, версия планировщика).
- **Без ключей.** ИИ только в чатах. Приложение и сервер не вызывают модели.
- **Валидация на входе.** Всё, что пишется в контент, проходит mdlint и `check`.

## См. также

- [Компоненты и контракты](components.md) · [Потоки данных](data-flows.md) · [Синхронизация](sync.md)
- [Исследование стека](../research/tech-stack.md)
