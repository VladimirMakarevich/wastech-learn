# Result line

One line in the learner's language, numbers instead of adjectives, no praise:

- en: `{{TOPIC}} saved: {{CARDS}} cards, first review {{WHEN}} ≈ {{MINUTES}} min.`
- ru: `Тема «{{TOPIC}}» записана: {{CARDS}} карточек, первое повторение {{WHEN}} ≈ {{MINUTES}} мин.`
- pl: `Temat „{{TOPIC}}” zapisany: {{CARDS}} kart, pierwsza powtórka {{WHEN}} ≈ {{MINUTES}} min.`

Use the plural form the number needs (1 карточка, 2 карточки, 5 карточек; 1 karta, 2 karty, 5 kart). `{{WHEN}}` and `{{MINUTES}}` come from `queue_status` and the due date `record_review` returned.
