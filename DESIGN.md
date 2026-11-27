---
name: wastech-learn
description: Calm, keyboard-first recall sessions under frosted chrome, dark by default for evening study.
colors:
  { tint: "oklch(74% 0.105 200deg)", tint-day: "oklch(51% 0.1 208deg)", on-tint: "oklch(19% 0.035 210deg)",
    ground: "oklch(14.5% 0.008 250deg)", ground-day: "oklch(96.4% 0.004 250deg)", sidebar: "oklch(17.5% 0.009 250deg)", sidebar-day: "oklch(94.6% 0.005 250deg)",
    surface: "oklch(20.5% 0.01 250deg)", surface-day: "oklch(100% 0 0deg)", surface-raised: "oklch(24.5% 0.011 250deg)", glass-solid: "oklch(23% 0.01 250deg)",
    ink: "oklch(96.5% 0.004 250deg)", ink-day: "oklch(21% 0.012 250deg)", body: "oklch(86% 0.008 250deg)", muted: "oklch(69% 0.012 250deg)",
    memory: "oklch(95% 0.045 85deg)", memory-day: "oklch(27% 0.03 250deg)", bar: "oklch(58% 0.012 250deg)", bar-day: "oklch(60% 0.012 250deg)", bar-weak: "oklch(52% 0.012 250deg)",
    again: "oklch(70% 0.19 22deg)", hard: "oklch(80% 0.15 66deg)", good: "oklch(77% 0.17 150deg)", easy: "oklch(71% 0.16 255deg)" }
typography:
  title: { fontFamily: "-apple-system, SF Pro Text, Inter (bundled), Ubuntu Sans, Segoe UI, system-ui, sans-serif", fontSize: "28px", fontWeight: 650, lineHeight: 1.28, letterSpacing: "-0.018em" }
  headline: { fontSize: "19px", fontWeight: 600, lineHeight: 1.45 }
  toolbar-title: { fontSize: "19px", fontWeight: 650, letterSpacing: "-0.015em" }
  body: { fontSize: "15px", fontWeight: 400, lineHeight: 1.5 }
  callout: { fontSize: "14px", fontWeight: 600 }
  footnote: { fontSize: "13.5px", fontWeight: 400 }
  caption: { fontSize: "12.5px", fontWeight: 500, fontFeature: "tnum" }
  mono: { fontFamily: "ui-monospace, SF Mono, JetBrains Mono, Ubuntu Sans Mono, Cascadia Code, monospace", fontSize: "12px" }
rounded: { inline: "6px", segment: "8px", sm: "10px", control: "12px", group: "16px", card: "18px", panel: "24px", pill: "999px" }
spacing: { xs: "4px", sm: "8px", md: "12px", lg: "16px", card: "22px", view: "28px" }
components:
  button-primary: { backgroundColor: "{colors.tint}", textColor: "{colors.on-tint}", rounded: "{rounded.sm}", padding: "8px 14px" }
  button-reveal: { backgroundColor: "{colors.tint}", textColor: "{colors.on-tint}", rounded: "{rounded.control}", height: "46px" }
  rating-button: { rounded: "{rounded.control}", padding: "10px 14px", typography: "{typography.callout}" }
  segmented-track: { rounded: "{rounded.sm}", padding: "2px" }
  segmented-segment: { rounded: "{rounded.segment}", padding: "6px 12px" }
  chip: { rounded: "{rounded.pill}", padding: "2px 10px", typography: "{typography.caption}" }
  card: { backgroundColor: "{colors.surface}", rounded: "{rounded.card}", padding: "{spacing.card}" }
  review-card: { backgroundColor: "{colors.surface}", rounded: "{rounded.panel}", padding: "26px 40px 22px" }
  decision-tray: { backgroundColor: "{colors.glass-solid}", rounded: "{rounded.panel}", padding: "{spacing.md}" }
  group-row: { backgroundColor: "{colors.surface}", padding: "10px 14px", typography: "{typography.callout}" }
  topic-row: { backgroundColor: "{colors.surface}", padding: "12px 14px" }
  field-search: { rounded: "{rounded.sm}", padding: "7px 10px", width: "320px" }
  switch: { backgroundColor: "{colors.tint}", rounded: "{rounded.pill}", width: "46px", height: "28px" }
  stepper: { rounded: "{rounded.sm}", padding: "2px", height: "32px" }
---

# Design System: wastech-learn

Visual system resolved by the Review build and the library pass (Home, Topics, Topic, Cards, Stats, Settings) in the [desktop prototype](prototypes/desktop-ui/README.md). Product truth, users and constraints live in [PRODUCT.md](PRODUCT.md). Tokens are oklch custom properties in `prototypes/desktop-ui/styles.css`; keys without `-day` are the dark rendition.

## Overview

**Creative North Star: "Evening Glass"**

A native-feeling study app in the iOS and macOS grammar: system type, tinted near-black grounds, grouped surfaces lifted by lightness, one teal tint, and frosted glass only on chrome that content scrolls beneath. The usual session is in the evening in a dim room, so dark is the primary rendition; light is a complete second rendition. Both follow the OS until the user picks one, and an explicit pick wins either way.

What the user reads (question, answer, diagram, inspector facts) sits on opaque surfaces. The signature move is **memory luminance**: retrievability (R) is the opacity of a solid point in a fixed per-theme color (warm white at night, ink by day). In Review the inspector shows the current session's cards as a field of points, the current one ringed in the tint; a just-rated card's point eases to its new value, and it always brightens: right after a review R is 1 whatever the rating, which only changes stability. The point recurs on every screen: a topic row carries a strip of small points, one per card; the Cards table, the topic's card list and the card inspector show R as a point plus its percent.

Rejected by the user: anything that reads as a SaaS dashboard, a game, or Anki.

**Key Characteristics:**

- Dark-first, light equally finished; theme follows the OS unless chosen.
- Library screens are iOS inset-grouped lists; glass only on the sticky toolbar, decision tray, mobile tab bar and toast.
- One teal tint for "you are here", focus and the primary action.
- Memory luminance: R as the opacity of a solid point, never a glow.
- Tabular figures on every number.

## Colors

Tinted cool neutrals (hue 250) carry everything; one teal tint and four rating hues are the only chroma. Each hue has `-weak` fill and `-ink` text values per theme.

### Primary

- **Evening Teal** (`tint`, `tint-day`): current navigation item (weak fill, tinted icon), focus rings, the Reveal and primary buttons, the 2px session progress line, the ring around the current memory point, today's bar in the forecast and the 30-day chart, a switch that is on, slider progress, text selection. Links use its `-ink` value.

### Semantic (ratings)

- **Again** red, **Hard** orange, **Good** green, **Easy** blue: weak fill with ink text on the four rating buttons, always with the number key, label and interval.

### Neutral

- **Night ground / Day ground** (`ground`) behind content; **Sidebar** an opaque step above it, since nothing scrolls under it.
- **Surface / Raised surface**: cards, the review card, grouped lists; raised is for diagram nodes and code blocks.
- **Ink, Body, Muted**: three label levels. Separators are translucent hairlines (`--border`, `--glass-edge`).
- **Memory** (`memory`, `memory-day`): the single point color; only opacity varies.
- **Bar / Bar weak** (`bar`, `bar-weak`): neutral chart bars; weak marks weekends in the 30-day chart.

### Named Rules

**The One Tint Rule.** The tint marks where the user is and what they do next. If two unrelated things on screen wear it, one is wrong.

**The No Red Debt Rule.** Red belongs to the Again rating and destructive actions. Due counts, backlog and missed days never turn red; the after-a-break mode has no color signal at all, its return plan reads from the text.

**The Rating Hues Stay Ratings Rule.** The four rating hues mean ratings only. Language and domain chips are neutral.

## Typography

**Body Font:** `-apple-system` / SF Pro Text on Apple; elsewhere Inter, self-hosted as variable woff2 (latin, latin-ext, cyrillic) in `prototypes/desktop-ui/fonts/` under the OFL; then Ubuntu Sans, Segoe UI, `system-ui`
**Mono Font:** `ui-monospace` / SF Mono, then JetBrains Mono, Ubuntu Sans Mono, Cascadia Code

**Character:** one family carries the hierarchy by size and weight, as on iOS. Mono is for code, keys and file paths only. Inter is bundled because the platform sans on Linux and Windows pulls furthest from iOS; no CDN.

### Hierarchy

- **Title** (650, 28px, 1.28; 22px at ≤760px): the question, the largest text in a session.
- **Headline** (600, 19px, 1.45; 17px at ≤760px): the answer under the reveal line.
- **Toolbar title** (650, 19px): the page name in the sticky toolbar.
- **Body** (400, 15px, 1.5): explanations, summaries, section heads at 650.
- **Callout** (600, 14px): buttons, grouped-list rows, inspector values.
- **Footnote / Caption** (12.5-13.5px): breadcrumbs, group headers, hints, rating intervals, shortcut legends.

### Named Rules

**The Tabular Figures Rule.** Every number (session count, minutes left, timer, intervals, R, badges) uses tabular figures, so it changes in place without reflow.

## Layout

A 244px opaque sidebar plus a scrolling content column (padding 28px 32px, max 1360px). The toolbar is sticky at the top of the content column. Review is a grid of `minmax(0, 1fr)` and a 300px inspector with a 28px gap; the review column holds the card and the decision tray, which sticks 16px above the bottom of the viewport. The question keeps its position across both phases; the reveal only adds the answer below it, which fades in and rises 8px over 0.32s on `cubic-bezier(0.16, 1, 0.3, 1)`, the one authored transition. `prefers-reduced-motion` removes every transition and animation, pseudo-elements included. Home opens on the today block (count and minutes at Title size, start row) beside a 380px 7-day forecast card, then grouped lists of topics and chat workflows; topics are grouped by domain. Settings caps at 680px. The demo-state segmented control sits in the toolbar; on Cards the toolbar search hides, since the screen has its own field.

- **≤1180px:** the inspector stacks below the review column (no sheet); the session-mode chip hides.
- **≤760px:** the sidebar collapses into a top row, navigation becomes a fixed glass tab bar (58px, five columns; Settings moves to a sliders-glyph link beside language and theme), the tray sits above it, ratings go 2×2 and Reveal spans full width; the Cards table becomes a list (title, topic, R point), a topic row's point strip wraps to its own line; side gutters are 16px or the safe-area inset. The inspector still stacks under the card and the tray scrolls away with it; an inspector sheet behind a button and an always-pinned tray belong to the mobile build (phase 2).

## Elevation & Depth

Content has no shadows: depth comes from lightness steps (ground, sidebar, surface, raised) plus a 1px hairline. Glass (`--glass` with `blur(28px) saturate(170%)` and a hairline edge) marks chrome floating over content. Shadows sit on floating chrome (the decision tray, toast and drawer, `--shadow`) and on two control states: the selected segment of a segmented control (`--shadow-raised`) and the white thumb of a switch or slider (`--thumb-shadow`). The drawer is an opaque surface sheet, not glass. With `prefers-reduced-transparency` or no `backdrop-filter`, glass falls back to the opaque `glass-solid`.

### Named Rules

**The Glass Floats Rule.** Glass exists only where real content passes beneath it. Never glass on content, never glass on glass, never a decorative gradient behind glass to make the blur visible.

## Shapes

Softly rounded corners, concentric where nested: the 24px tray with 12px padding holds 12px rating buttons and Reveal. Cards are 18px, grouped lists 16px, controls and nav items 10px, inline code and keycaps 6px. Segmented controls are rounded rectangles (10px track, 8px segment), not pills; chips (translucent neutral fill), badges and the session-mode label are pills. A card's type and level on its chip (`why · understand`) stay English in every UI language: they are methodology terms, as in the card-types doc. Cards, grouped lists and the review card carry a 1px hairline border; rows inside a group are divided by hairlines.

## Components

### Buttons

- **Primary / Reveal:** tint fill, `on-tint` text, 600 weight. Reveal is 46px tall, min 260px, 12px radius, with its `Space` keycap drawn by a softened border around full-contrast text (a faded label fails AA on the tint).
- **Neutral:** translucent fill, ink text; hover deepens the fill, press scales to 0.98. Background transitions take 0.18s.
- **Focus:** 2px tint outline, 2px offset, on every interactive element.

### Rating buttons

Four columns in the tray, each a weak fill of its hue with ink text: keycap, short label («С трудом», not the full phrase), and the interval below in tabular figures; the Hard hint says it is a pass. The suggested rating gets an inset 2px ring in its own hue, so the outer tint ring stays reserved for focus.

### Decision tray

One glass panel at the bottom of the review column holds the whole decision. Before reveal: the confidence segmented control (1-3 with keycaps) and Reveal. After reveal: the four ratings and a one-line hint. Its content fades in from 0.4 opacity over 0.24s only when the phase changes.

### Inset-grouped lists

The library's container and the inspector's: a muted 13px header (`.group-h`) above an opaque 16px-radius group (`.group-body`) with hairline-divided rows, an optional muted 13px footer (`.group-f`) below; groups are 32px apart. Labels in body color, values in ink at 600 with tabular figures. A topic row (`.t-row`) is title over muted domain · language, the point strip, due today and a chevron; a chat row is a bold name, a one-line description and its tool.

### Native controls

Drawn after iOS, not left to the browser: a 46×28 switch (`role="switch"`, tint when on), a stepper (two 34px buttons around a tabular value on the fill), a slider (4px track, tint progress, 24px white thumb), segmented controls, and a type filter strip of segmented tokens. Cards search is a 320px filled field with a tint focus ring. All keep keyboard focus and labels. Charts are one labeled chart per need, never a tile: Home's 7-day forecast and Stats' 30-day chart (160px bars, Y extremes and X dates in 11.5px muted figures). Bars are `bar` with today in the tint.

### Memory field

The signature component: a grid of 22px cells with 11px solid points in the memory color, opacity from R (0.16-1.0). New cards are a 1.5px outline at 0.55; the current card gets a 2px tint ring; opacity changes ease over 0.9s. A one-line legend reads three graded points as «R now» and an outline as «new». The small point (14px cell, 8px dot) fills topic strips; the inline R point is 9px beside its percent.

### Diagrams and code

Mermaid SVG is inlined without its own styles or plate and painted from tokens (nodes on raised surface, lines muted, text ink), so both themes are native. At ≤760px a diagram keeps a 560px minimum width and scrolls sideways, its right edge fading while more remains. Code uses Shiki light and dark themes through CSS variables on the raised surface.

## Do's and Don'ts

### Do:

- **Do** keep reading content on opaque surfaces and reserve glass for the toolbar, decision tray, mobile tab bar and toast.
- **Do** draw retrievability as memory luminance: a solid point whose opacity carries R.
- **Do** give both themes full craft and let diagrams take their colors from tokens.
- **Do** honor reduced transparency and reduced motion with opaque fallbacks and no animation.
- **Do** pair every rating hue with its number key, label and interval.

### Don't:

- **Don't** ship a SaaS dashboard look: no indigo on slate, no grids of KPI tiles, no shadowed content cards.
- **Don't** gamify: no confetti, mascots, streak flames, trophies or celebratory color.
- **Don't** fall back to Anki-style utility: grey tables and raw form controls as the main surface.
- **Don't** use glows, halos or blurred color blobs; luminance is a solid point, not light bleed.
- **Don't** costume iOS on the desktop: no fake status bar, home indicator or device frame.
