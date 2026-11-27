# Документация wastech-learn

Карта документации и порядок чтения. Все документы на 2026-11-25 в статусе **draft**. Решения из ADR считаются принятыми, пока их не заменит новый ADR.

## Порядок чтения

1. [Happy path на схемах](product/happy-path.md), затем [видение, цели, non-goals](product/vision.md)
2. [Персона и сценарии J-xx](product/journeys.md)
3. [Принципы обучения LP-xx](learning/principles.md) и [процесс изучения темы](learning/study-process.md)
4. [Модель контента](content/repo-layout.md) и [карточки](content/cards.md)
5. [Требования](requirements/README.md), затем [архитектура](architecture/overview.md)
6. [Roadmap и MVP](roadmap.md)

## Продукт

| Документ | О чём |
| --- | --- |
| [happy-path.md](product/happy-path.md) | Весь процесс на трёх схемах: путь темы, день 0, сессия повторения |
| [vision.md](product/vision.md) | Проблема, цели G-xx, non-goals, метрики успеха |
| [journeys.md](product/journeys.md) | Персона, сценарии J-01…J-09 |
| [glossary.md](glossary.md) | Словарь терминов (проверяется CTX-003) |

## Методика обучения

| Документ | О чём |
| --- | --- |
| [principles.md](learning/principles.md) | Принципы из «Запомнить всё» и исследований, связь с фичами |
| [study-process.md](learning/study-process.md) | Цикл изучения темы, ритм на день, неделю и месяц |
| [card-types.md](learning/card-types.md) | Каталог типов карточек: технические и языковые |
| [card-writing-rules.md](learning/card-writing-rules.md) | Правила формулировки и лимиты размера |

## Контент и данные

| Документ | О чём |
| --- | --- |
| [setup.md](setup.md) | Установка с нуля: фреймворк, контент-репозиторий из шаблона, агенты, приложение |
| [repo-layout.md](content/repo-layout.md) | Структура `wastech-learn-content` |
| [topic-files.md](content/topic-files.md) | `index.md`, `summary.md`, `materials.md`, диаграммы |
| [visuals.md](content/visuals.md) | Виды визуала и правила наглядности |
| [cards.md](content/cards.md) | Формат карточки, варианты, жизненный цикл `id` |
| [multilang.md](content/multilang.md) | Языки тем (en/ru/pl) и изучение польского |
| [review-log.md](content/review-log.md) | Журнал событий повторения (JSONL) |
| [mdlint-policy.md](quality/mdlint-policy.md) | Пресет mdlint и `wastech-learn check` для контента |

## Планирование повторений

| Документ | О чём |
| --- | --- |
| [srs.md](scheduling/srs.md) | FSRS, параметры, смысл четырёх оценок |
| [backlog.md](scheduling/backlog.md) | Нерегулярный ритм, бэклог, режим «5 минут» |
| [metrics.md](scheduling/metrics.md) | Метрики обучения, leech, оптимизатор |

## ИИ-интеграция

| Документ | О чём |
| --- | --- |
| [capture.md](ai/capture.md) | Захват темы из Claude Code и других чатов |
| [learning-package.md](ai/learning-package.md) | Формат пакета и промпт экспорта для ChatGPT и других чатов |
| [mcp-tools.md](ai/mcp-tools.md) | Инструменты MCP-сервера `wastech-learn-mcp` |
| [tutor-and-grading.md](ai/tutor-and-grading.md) | Поведение ИИ-тьютора, оценка ответа по рубрике |

## Архитектура и UX

| Документ | О чём |
| --- | --- |
| [overview.md](architecture/overview.md) | Контекст и контейнеры (C4), деплой по фазам |
| [components.md](architecture/components.md) | Пакеты, зависимости, контракты |
| [data-flows.md](architecture/data-flows.md) | Sequence-диаграммы ключевых потоков |
| [sync.md](architecture/sync.md) | Синхронизация устройств |
| [screens.md](ux/screens.md) | Экраны и wireframes |
| [interaction.md](ux/interaction.md) | Горячие клавиши, тексты, i18n, a11y |

## Решения, исследования, планы

- Требования: [README](requirements/README.md) · [захват](requirements/fr-capture.md) · [повторение](requirements/fr-review.md) · [контент](requirements/fr-content.md) · [аналитика](requirements/fr-insights.md) · [языки](requirements/fr-language.md) · [NFR](requirements/nfr.md)
- [ADR - журнал архитектурных решений](adr/README.md)
- [Исследования: наука обучения, SRS, стек, захват из чатов](research/README.md)
- [Roadmap и MVP](roadmap.md)
- [Риски и открытые вопросы](risks-and-questions.md)
