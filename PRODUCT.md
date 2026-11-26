# Product

<!-- impeccable:product-schema 1 -->

Design context for UI work on `wastech-learn`. The source of truth stays in [docs/](docs/README.md); this file condenses what design decisions need and links back.

## Platform

web

## Stack

Undecided — [Q-13](docs/risks-and-questions.md), [ADR-0006](docs/adr/0006-headless-core-angular-ionic-ui.md) is `proposed`. The choice is made after the [clickable prototype](prototypes/desktop-ui/README.md) is reviewed, before M4. Candidates: the Ionic template `wastechlab-mobile-template`; desktop-first Angular (Material/CDK) with Capacitor later; Astro with an interactive island. Fixed either way: all logic lives in the headless TypeScript packages `core`, `srs`, `content-fs`; the UI reads content from a prerendered bundle and state only through `ReviewStore`.

## Users

One user, the author: a senior developer (Angular, .NET) — [persona](docs/product/journeys.md). Studies architecture, high-load and patterns in English, some topics in Russian, and learns Polish. Breaks topics down in subscription AI chats (mostly Claude Code, sometimes ChatGPT), edits content in VS Code, reviews irregularly — some weeks daily, some weeks once. Learns best from visuals: diagrams, comparison tables, annotated code.

The repository is public under MIT as a showcase of code and docs, not a product for other people. No onboarding, multi-user or sharing concerns.

## Product Purpose

A personal spaced-repetition learning framework ([vision](docs/product/vision.md)). A topic discussed in any AI chat becomes, in about 15 minutes, a templated summary, materials, a visual breakdown and a small set of good cards; FSRS then decides what to review and when. Success: real long-term recall three months later — true retention 85–93% at DR 0.90, use for 4 weeks at ≥3 sessions a week, median session ≤15 minutes, leech share under 5%.

## Positioning

Not a deck app and not an Anki clone. Knowledge is born in the user's own AI conversations, the human selects and edits every card the AI proposes, and all data is plain Markdown, SVG and JSONL in the user's own git repository — the app can disappear and nothing is lost. The methodology is evidence-based (Make It Stick: retrieval, spacing, interleaving, calibration), and the product is built to survive irregular use without guilt.

## Operating Context

- **Capture** happens outside the app: Claude Code with skills and MCP in `wastech-learn-content`, or ChatGPT via a Markdown learning package imported later.
- **Review** happens in a desktop browser against a local server: short keyboard-driven sessions (5 min, 15 min, whole queue), questions from mixed topics, confidence 1–3 before the answer, rating 1–4 after it.
- **Reading** a topic: a 12-section summary with SVG diagrams, comparison tables and highlighted code; the self-check stays closed until asked.
- **Editing** happens in VS Code; the app links out with `vscode://` (`e`).
- **Return after a break**: the backlog is spread over days of 15-minute sessions, new cards pause automatically.
- Two computers sync through git; a mobile app and cloud are phase 2.

Screens and wireframes: [screens](docs/ux/screens.md); shortcuts, labels, i18n: [interaction](docs/ux/interaction.md).

## Capabilities and Constraints

- MVP screens: Home, Review, Session end, Topic, Browser, Stats (minimal), Settings. Later: Fix list (leech), Cram.
- Card types include `basic`, `scenario` (rubric checklist instead of one answer), `vocab` (two directions, 🔊 via Web Speech `pl-PL`, hidden without a voice) and `grammar-cloze` — [card types](docs/learning/card-types.md).
- Rating labels are fixed in three languages; Hard is always a pass — [interaction](docs/ux/interaction.md).
- UI language ru/en/pl, independent of the topic's content language; CLDR plurals; key parity checked in CI.
- Local-first and offline: no telemetry, no CDN fonts, no third-party requests, no API keys or model calls ([NFR](docs/requirements/nfr.md)).
- Desktop-first wide layout (reading column, split panes); responsive from 360 px for the later mobile build.
- Light and dark themes follow the OS; diagrams have transparent backgrounds and `currentColor`.
- The next card appears in under 50 ms.
- Terms of the craft (FSRS, backpressure, change detection) stay in English in every UI language.

## Brand Commitments

- Name: `wastech-learn`.
- Voice: calm, brief, concrete, on the user's side; numbers over adjectives ("≈ 6 min"). No guilt, no hype, no exclamation marks, no celebration, no decorative emoji, no pressure tactics — [tone of voice](.rules/tone-of-voice.md).
- No streaks, no "you missed N days", no red debt badges; the activity heatmap is off by default — [values](.rules/values-and-philosophy.md).

## Evidence on Hand

- Real content: the golden sample in the private `wastech-learn-content` repo, exported into the prototype's `data.js` by `npm run proto:data`.
- [Clickable desktop prototype](prototypes/desktop-ui/README.md): its screen layout and flows are validated evidence. Its look now follows the [DESIGN.md](DESIGN.md) world; the Review screen is the first one built in it, the other screens only inherit its tokens.
- Happy-path diagrams: [docs/assets/happy-path/](docs/product/happy-path.md).
- Intervals, R, stability and statistics in the prototype are demo values — FSRS is not computed there. No real usage metrics exist yet; do not fabricate them.

## Product Principles

1. **Recall before reveal.** Every surface that shows knowledge first asks to recall it: question before answer, self-check before summary, pretest before explanation.
2. **The human decides.** The AI proposes cards, ratings and hints; the user selects, edits and confirms.
3. **Honest numbers, no guilt.** Show minutes and counts the user can act on; plan the return after a break instead of punishing it.
4. **Seeing is understanding.** Every topic carries a diagram or comparison table and a concrete example.
5. **Respect attention.** Short sessions are first-class; if a feature only makes the app look busier, leave it out.

## Accessibility & Inclusion

- A full review session works from the keyboard alone; focus is always visible.
- WCAG AA contrast; color is never the only signal — ratings carry a number and a label.
- Rating buttons are `button` elements with `aria-keyshortcuts` and full labels.
- `prefers-reduced-motion` disables the card flip animation.
- SVG diagrams carry alt text; complex ones also get a text description in the summary.
