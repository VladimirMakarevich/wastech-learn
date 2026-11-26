---
version: 1
slug: "review"
primary_target: "review"
related_targets: []
---

# Surface: Review session

Mode: Operate. Primary scene: evening, desk, dim room (dark rendition leads).

Job: recall one review item at a time from the keyboard — question, confidence 1–3, reveal (Space), answer with diagram, rating 1–4 with intervals; `scenario` shows a rubric checklist. Short sessions (5 min, 15 min, whole queue). The next card appears in under 50 ms. Flows and shortcuts: docs/ux/screens.md, docs/ux/interaction.md.

Memorable moment: the inspector's session memory field — one point per card of the session, the current card ringed in the tint; the point of the card just rated brightens to R = 1 as the next card appears.

Resolved in the build: teal tint, radii 10/18/24, Title 28px. Non-Apple UI face: Inter, bundled. UI stack: desktop-first Angular + CDK (ADR-0006).

## Direction contract

THESIS: A review session as a calm native desk app — one opaque card under floating frosted chrome; refuses the SaaS dashboard of tiles and the gamified reward screen.

OWN-WORLD: Dark-first iOS/macOS grammar: system type, tinted near-black grounds with grouped surfaces lifted by lightness, frosted glass only on chrome that content scrolls beneath (toolbar, decision tray, mobile tab bar, toast; the drawer is an opaque sheet), teal tint, one tint for "you are here", rating hues red/orange/green/blue paired with number and label, memory luminance points for R, tabular figures.

STORY: The user sees how far into the session they are, recalls before seeing the answer, judges honestly, and moves on without guilt or noise.

FIRST VIEWPORT: Opaque sidebar left (nothing scrolls beneath it, so no glass); sticky glass toolbar with the page title, session mode, "1 / 12", "≈ N мин осталось", timer and Finish (Esc), a 2px tint progress line on its bottom edge; centered opaque review card with breadcrumb, type chip, and the question at Title size anchored near the top of the card, so it keeps its place when the answer appears below it (no jump on reveal); the decision lives in one glass tray pinned to the bottom of the review column — before reveal: confidence segmented control (1–3) and the primary Reveal button (Space) in the tint; after reveal the same tray holds the four rating buttons with intervals. Inspector right as iOS inset-grouped lists: session memory-point field (signature), FSRS state (demo), key idea, file + Open in VS Code.

FORM: user-pinned iOS-inspired frosted-glass world; seed: seed:a5564e9832068b9c (world overridden by user pin: «нужно что то более свежее по стилям, можно вдохновлятся ios стилями, можно добавлять матовое glass»). The pin names only the world; the signature move (memory luminance) comes from the roll's assigned direction, translated into this world.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
