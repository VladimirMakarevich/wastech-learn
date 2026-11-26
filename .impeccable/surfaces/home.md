---
version: 1
slug: "home"
primary_target: "home"
related_targets: ["topics","cards","stats","prefs"]
---

# Surface: Library screens (Home, Topics, Topic, Cards, Stats, Settings)

Mode: Operate. Scene: the same evening desk as Review; Home is opened before a session, the rest between sessions to browse, check a topic or adjust a setting.

Job: Home answers «сколько сегодня и сколько это минут» and starts a 5/15/all session in one key; Topics and Topic show what is known and how well; Cards finds any card by text, domain and type; Stats says whether retention and load are healthy in words, not tiles; Settings changes DR, limits, session length, voice and heatmap. Specs: docs/ux/screens.md, docs/ux/interaction.md.

Owner answers (2026-11-26): memory points everywhere (topic rows and the cards table use the Review point instead of bars and bare percentages); Stats as iOS grouped lists with one labeled 30-day chart; Settings and card filters fully iOS-native controls (switch, stepper, slider, segmented, filter tokens), keyboard and a11y kept.

## Direction contract

THESIS: The library of a calm native study app — iOS inset-grouped lists with memory points as the one recurring figure; refuses the SaaS grid of same-size cards and KPI tiles and the Anki grey table with raw form controls.

OWN-WORLD: Evening Glass unchanged: tinted near-black grounds, opaque 16px grouped lists with hairline rows, muted 13px headers above and footers below groups, teal tint only for the current place and the primary action, neutral chips (language chips neutral), memory-colored solid points whose opacity is R, tabular figures, glass only on the toolbar and mobile tab bar.

STORY: The user sees today's load in minutes and starts; sees each topic's memory at a glance as a row of points; finds a card in seconds; reads in plain words that retention is fine; changes a setting with a control they already know from iOS.

FIRST VIEWPORT: Home — left, the today block: «12 карточек ≈ 3 мин» at Title size, the new/Polish line, start row (5 min primary with Enter keycap, 15 min, whole queue); right, a 7-day forecast with today in the tint. Below, a grouped list «Темы»: one row per topic with title, domain · language in muted text, a strip of memory points (one per card), due today, chevron. Then a grouped list «Из чата» with the two chat workflows.

FORM: established-world extension of the Review surface; seed: none (pinned) — «Точки везде», «Списки в стиле iOS», «Полностью по-iOS».

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
