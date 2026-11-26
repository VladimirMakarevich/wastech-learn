# Фаза 09 — Экран Review

[⌂ plan](index.md) · [спека](../index.md)

- **Статус:** ☐
- **Зависит от:** 03, 08
- **Даёт:** Сессия с клавиатуры: все типы карточек, уверенность, оценки, действия, озвучка

## Цель

Главный сценарий вехи — сессия из 20 review items только с клавиатуры ([roadmap](../../../roadmap.md)).

## Шаги

1. `session/`: хранилище на signals над движком из фазы 03; `now` и RNG оболочки; события уходят в `ReviewStore`; `events-changed` и `content-changed` вызывают `refresh`.
2. Экран по контракту Review из DESIGN.md: вопрос вверху, уверенность 1–3, «Показать ответ» (`Space`), ответ, объяснение и схема, 4 кнопки с подписями, интервалами и `aria-keyshortcuts`, счётчик `7 / 23`.
3. Типы: `scenario` — рубрика-чеклист с предложенной оценкой, `vocab` — `fwd` и `rev`, `cloze` и `grammar-cloze` — скрытый пропуск варианта.
4. Действия: `u`/`Ctrl+Z`, `o`, `e` (`vscode://file/…` из `/api/status`), `!`, `b`, значок «изменена» и `reset`; `Esc` — к итогам.
5. `tts/`: Web Speech, голос `pl-PL`, кнопка 🔊 и `p` только при наличии голоса.
6. Боковая панель контекста темы и состояния FSRS, как в прототипе.

## Затронутые файлы

- `packages/app/src/app/session/`
- `packages/app/src/app/screens/review/`
- `packages/app/src/app/tts/`
- `packages/app/e2e/review.spec.ts`

## Правила

UI читает состояние только через `ReviewStore` и `session` ([architecture](../../../../.rules/architecture.md)); фокус всегда виден; цвет не единственный признак.

## Тесты

E2E на журнале-фикстуре: 20 карточек только `keyboard.press`, отмена, действия, подмена `speechSynthesis`; замер времени до следующей карточки.

## Приёмка фазы

- [ ] AC-F06, AC-F07, AC-F09…AC-F12 (кроме `unsuspend`), AC-F20 и первая часть AC-N02 проходят.
- [ ] Lint, тесты и e2e зелёные.
