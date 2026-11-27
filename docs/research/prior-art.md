# Исследование: существующие решения

Что уже есть в мире интервального повторения и что из этого берём.

## Markdown-ориентированные SRS

| Инструмент | Синтаксис | Где состояние | Плюсы / минусы | Что берём |
| --- | --- | --- | --- | --- |
| Obsidian Spaced Repetition | `Q::A`, `?`, cloze `==x==` | Inline-комментарий в заметке | Каждое повторение переписывает заметку: шум в git | Лаконичность синтаксиса |
| Obsidian SR Recall | Тот же | В заметке или в `tracked_files.json` + `ob-revlog.csv` | FSRS через ts-fsrs | Отдельный лог для оптимизатора |
| Obsidian_to_Anki | Блоки START/END | В Anki, ID пишется обратно в файл | Markdown - источник истины | Стабильный ID в исходнике |
| Mochi | Markdown, стороны через `---`, шаблоны | Облако или локально | Только 2 оценки, FSRS опционален | Бинарная оценка как запасной режим |
| RemNote | `Q >> A` в заметках | БД | При повторении виден контекст | Ссылка из карточки на summary |
| Logseq | `#card`, `{{cloze}}` | Свойства блока | - | - |
| org-fc / org-srs | Заголовки-карточки | Drawer или отдельный TSV | Plain text + FSRS | Отдельный журнал истории |
| **hashcards** | `Q:` / `A:`, `C:` | SQLite | ID = хэш текста → **правка сбрасывает прогресс** | Минимум трения; клавиши Space и 1-4; урок про ID |
| Orbit (Matuschak) | Карточки внутри эссе | Сервер | Исследовательский проект | Повторение сразу после чтения; принципы хороших prompts |

## Anki: что берём

- Note → cards (siblings), GUID сохраняет историю при правке → у нас карточка → варианты, стабильный `id`.
- Колоды и теги, filtered decks → у нас домены и темы, теги, cram (`practice`).
- Image occlusion (с 23.10), type-in answer → Later.
- Браузер с поиском (`tag:`, `is:due`, `prop:`, `rated:`) → FR-306 (Later).
- True retention, прогноз, симулятор FSRS → метрики.
- Дневные лимиты (20 новых и 200 повторений по умолчанию), bury siblings, leech → очередь.

## Quizlet: что берём

| Режим | Ценность | Решение |
| --- | --- | --- |
| Learn | Адаптивный формат, guidance fading (multiple choice → письменный ответ) | Только идея guidance fading для первого показа (Later) |
| Test | Итоговая самопроверка | Похоже на смешанную сессию |
| Flashcards | Перелистывание без планирования | Нет: всё через FSRS |
| Match | Игра на скорость, **[вывод]** почти нулевая ценность для обучения | Не делаем (non-goal) |

## ИИ-генерация карточек (2024-2026)

- **NotebookLM** (сентябрь 2025): карточки и квизы по загруженным источникам, без планирования. Обзоры называют функцию базовой.
- **MCP-серверы для Anki** (anki-mcp-server и др.) создают карточки из чата Claude через AnkiConnect - прямой аналог нашего захвата.
- **Matuschak о LLM:** с декларативными фактами справляются, концептуальные карточки пишут плохо. Нужно задавать угол (почему, trade-off), давать контекст в несколько тысяч токенов. Решать, *что* запоминать, лучше человеку.
- **SmartFlash** (n=6): пользователи хотят редактируемый результат и «cognitive ownership».
- **[вывод] Для нас:** `status: draft|active`, в очередь только `active`. Тип и угол (`type`, `bloom`) задаются явно. Лимиты через mdlint и `check`. Источник пишется в `origin`. В повторении есть кнопка «переписать».

## Ключевые уроки

1. **Состояние отдельно от контента** (Obsidian SR - анти-пример, org-fc и SR Recall - пример).
2. **Стабильный ID, не хэш** (hashcards - анти-пример, Anki GUID - пример).
3. **Журнал повторений - первичные данные** (оптимизатор, смена модели, статистика).
4. **ИИ-карточки - черновики**, человек отбирает.

## Источники

- <https://github.com/st3v3nmw/obsidian-spaced-repetition> · <https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall>
- <https://github.com/eudoxia0/hashcards> · <https://borretti.me/article/hashcards-plain-text-spaced-repetition>
- <https://github.com/bohonghuang/org-srs> · <https://github.com/andymatuschak/orbit>
- <https://medium.com/tech-quizlet/selecting-question-formats-to-maximize-the-testing-effect-7917226a2667>
- <https://workspaceupdates.googleblog.com/2025/09/flashcards-quizzes-reports-notebook-lm-google-education.html>
- <https://github.com/nailuoGG/anki-mcp-server> · <https://notes.andymatuschak.org/zPZqDQquq8TAxRVqCQTkxkq>
