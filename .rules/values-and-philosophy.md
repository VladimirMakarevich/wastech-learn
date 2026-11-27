# The product's values and philosophy

> One of the main rules for `wastech-learn`. Index - [.rules/README.md](README.md). Where they come from - [vision](../docs/product/vision.md) and [learning principles](../docs/learning/principles.md).

These values decide the cases no requirement covers. When a feature, a screen or a prompt is in doubt, check it against them.

## What we believe in

- **Remembering is a skill built by recall, not by rereading.** Every surface that shows knowledge first asks to recall it: the question before the answer, the self-check before the summary, the pretest before the explanation (LP-01, LP-16).
- **Spacing and mixing beat cramming.** The scheduler decides when; the queue mixes domains; nothing rewards a marathon session (LP-02, LP-03).
- **The human decides what to remember.** The AI proposes candidate cards, suggests a rating, offers a hint - the user selects, edits and confirms. A feature that removes the user's choice from the loop is the wrong feature (LP-06, LP-15, ADR-0009).
- **Effort is the point.** A good card is hard enough to require a real attempt and small enough to be answerable. The AI tutor never hands over an answer before an attempt (LP-10, LP-15).
- **Fewer, better cards.** If a topic yields fewer than five good cards, add none. Card count is never a goal or a metric of progress (LP-13).
- **Seeing is understanding.** Every topic gets a diagram or a comparison table and a concrete example from the user's own stack (LP-12, LP-14).

## How we treat the person

- **No guilt.** Life is irregular; the product assumes breaks and plans the return. No streaks, no "you missed N days", no red badges of debt. Again is a normal answer.
- **Honest numbers.** Minutes and counts the user can act on (≈ 6 min today), not scores designed to keep them hooked.
- **Respect for attention.** Short sessions are first-class (the five-minute mode); reminders are rare, quiet and opt-in.

## How we treat the data

- **The knowledge belongs to the user.** Plain Markdown, SVG and JSONL in their own git repository; the app can disappear and nothing is lost.
- **Private by default, local first.** No telemetry, no accounts, no third-party calls; the cloud phase stays behind the user's own access control.
- **No keys, no vendor lock-in.** AI runs inside the chats the user already pays for; any chat can feed the system through a plain Markdown package.

## The lens

Before shipping anything, ask: **will this help the user recall and apply the topic three months from now, with less effort and no guilt?** If the honest answer is "it makes the app look busier", leave it out.

## Related rules

- [tone-of-voice.md](tone-of-voice.md) - how the product sounds.
- [documentation.md](documentation.md) - how decisions are recorded.
