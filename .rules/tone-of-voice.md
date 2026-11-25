# Tone of voice

> One of the main rules for `wastech-learn`. Index — [.rules/README.md](README.md). Applies to UI copy in ru/en/pl, the AI tutor's prompts and replies, CLI and MCP messages. Learning content (cards, summaries) follows [card-writing-rules](../docs/learning/card-writing-rules.md) instead.

## How the product sounds

- **Calm, brief, concrete.** One short sentence beats two; a number beats an adjective ("≈ 6 min", not "a quick session").
- **On the user's side.** Name what people recognize (topic, card, session), not how the system is built (bundle, replay, writer).
- **No guilt, no hype.** Never "you missed", "streak lost", "only N left!", exclamation marks or celebration confetti. Progress is shown over weeks, mistakes as a normal step.
- **Active and exact controls.** A button says what happens ("Show answer", "Practice topic"); the confirmation says what happened ("Rating undone").

| Not like this | Like this |
| --- | --- |
| «Вы пропустили 14 дней!» | «С возвращением! Накопилось 180 карточек ≈ 45 мин» |
| «Неправильно» | «Не вспомнил — покажу позже» |
| «Осталось 300 карточек» | «На сегодня ≈ 15 мин, остальное подождёт» |
| «Ошибка валидации» | «В карточке нет секции Answer — добавь её и сохрани снова» |

## Three languages

- Write each language natively; never translate word for word. Russian uses the informal **«ты»** in prompts and hints, and impersonal or first-person forms in labels («Не вспомнил», «Предлагаю…»). Polish uses the informal **„ty”** the same way.
- Plurals through CLDR forms in every language ("1 карточка / 2 карточки / 5 карточек", "1 karta / 2 karty / 5 kart").
- Rating labels are fixed across the product in all three languages — the single source is the table in [interaction](../docs/ux/interaction.md#подписи-к-оценкам); a narrow button may shorten a label only to its first words. Hard is always explained as a pass.
- Terms of the craft stay in English inside any language (FSRS, backpressure, change detection).

## The AI tutor's voice

- **Socratic and patient:** a question before an explanation, one idea at a time, hints by the H0–H4 ladder ([tutor-and-grading](../docs/ai/tutor-and-grading.md)).
- Speaks the **user's** language; writes artifacts in the **topic's** language.
- Grading is a suggestion with one line of reasons; the final word is the user's.
- Short replies: subscription limits are real, so no preambles, no recaps of what was just said.

## Errors and tool messages

- Say what went wrong and how to fix it, in that order, with the file and line when there is one. No apologies, no vagueness.
- CLI and MCP messages are English, single-line where possible, actionable: `content/…/cards/7k2m9xqd.md: Answer has 19 words, limit 12 for basic`.

## Banned patterns

- Filler and AI clichés: «Давайте разберёмся», «Важно отметить», «Отличный вопрос!», "Let's dive in", "It's worth noting", "Great question!".
- Emoji as decoration (a functional icon like the 🔊 speech button is fine), ALL CAPS, rhetorical questions in UI labels.
- Pressure tactics: countdowns, scarcity, comparison with other people.

## Related rules

- [values-and-philosophy.md](values-and-philosophy.md) — why the product sounds this way.
- [interaction](../docs/ux/interaction.md) — shortcuts, labels and i18n details.
