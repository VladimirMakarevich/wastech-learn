import type { Message } from "./types.js";

/**
 * English catalog. It defines the set of keys: the Russian and Polish catalogs are typed against it, so a
 * key missing in any language fails the build, and a parity test checks placeholders and plural forms.
 * Messages name files, rules and counts, never the text of a card.
 */
export const en = {
  "finding.front-matter-missing":
    "No front matter: start the file with a --- block",
  "finding.front-matter-yaml": "Front matter is not valid YAML: fix the syntax",
  "finding.front-matter-schema":
    "Front matter field {field} is missing or invalid",
  "finding.section-missing": "No ## {section} section: add it",
  "finding.topic-file-missing":
    "The topic has no {name}: add it next to index.md",
  "finding.topic-missing":
    "The card is outside a topic: content/{topic}/index.md is missing or invalid",
  "finding.question-words": {
    count: "count",
    one: "Question has {count} word, limit {limit} for {type}",
    other: "Question has {count} words, limit {limit} for {type}",
  },
  "finding.answer-words": {
    count: "count",
    one: "Answer has {count} word, limit {limit} for {type}",
    other: "Answer has {count} words, limit {limit} for {type}",
  },
  "finding.answer-points": {
    count: "count",
    one: "Answer has {count} point, limit {limit} for {type}",
    other: "Answer has {count} points, limit {limit} for {type}",
  },
  "finding.rubric-missing": "A {type} card needs a ## Rubric section",
  "finding.rubric-items": {
    count: "count",
    one: "Rubric has {count} item, limit {limit}",
    other: "Rubric has {count} items, limit {limit}",
  },
  "finding.rubric-required":
    "Rubric has no required item: mark at least one with (!)",
  "finding.code-lines": {
    count: "count",
    one: "Code block has {count} line, limit {limit}",
    other: "Code block has {count} lines, limit {limit}",
  },
  "finding.code-width": {
    count: "count",
    one: "Code line is {count} character wide, limit {limit}",
    other: "Code line is {count} characters wide, limit {limit}",
  },
  "finding.cloze-gaps":
    "Cloze {variant} hides {count} spans: keep one per variant",
  "finding.cloze-variants": {
    count: "count",
    one: "Cloze card has {count} variant, expected 1 to {limit}",
    other: "Cloze card has {count} variants, expected 1 to {limit}",
  },
  "finding.vocab-lang-pair": "A vocab card needs langPair in its front matter",
  "finding.vocab-example": "Answer has no example sentence: add one in italics",
  "finding.id-unique": "id {id} is already used in {other}",
  "finding.diagram-svg-missing":
    "No rendered SVG next to this source: run wastech-learn render",
  "finding.diagram-stale":
    "The SVG is older than {source}: run wastech-learn render",
  "finding.summary-link":
    "Sources have no link to a ../summary.md# section: add one",
  "finding.active-edit":
    "{section} of an active card changed by {percent}%: if the meaning changed, retire it and add a new card",
  "finding.preset-invalid":
    "Not a valid wastech-mdlint config: copy the preset that ships with the CLI",
  "finding.preset-drift":
    "Preset rule {rule} (#{position}) is missing or changed: restore it from the CLI preset",

  "count.files": {
    count: "count",
    one: "{count} file",
    other: "{count} files",
  },
  "count.errors": {
    count: "count",
    one: "{count} error",
    other: "{count} errors",
  },
  "count.warnings": {
    count: "count",
    one: "{count} warning",
    other: "{count} warnings",
  },
  "count.topics": {
    count: "count",
    one: "{count} topic",
    other: "{count} topics",
  },
  "count.cards": {
    count: "count",
    one: "{count} card",
    other: "{count} cards",
  },

  "cli.check.summary": "{files}, {errors}, {warnings}",
  "cli.check.clean": "{cards} checked, no findings",
  "cli.build.written": "Bundle written to {file}: {topics}, {cards}",
  "cli.build.blocked": "Bundle not written: fix the errors above and run again",
  "cli.render.rendered": "Rendered {file}",
  "cli.render.stale": "Stale: {file}",
  "cli.render.summary": "Diagrams: {total}, rendered: {rendered}",
  "cli.render.check-summary": "Diagrams: {total}, stale: {stale}",

  "cli.simulate.header":
    "Break of {breakDays} days, sessions of {sessionMinutes} min, {cards} ({items} review items) after {warmupDays} days of daily study, seeds {seeds}",
  "cli.simulate.col.order": "Order",
  "cli.simulate.col.median": "Median sessions",
  "cli.simulate.col.cleared": "Cleared in ≤ {target}",
  "cli.simulate.col.recall": "Recall",
  "cli.simulate.default": "{order} (default)",
  "cli.simulate.never": "not within {days}",
  "cli.simulate.days-title": "Day by day, {order}, seed {seed}:",
  "cli.simulate.col.day": "Day",
  "cli.simulate.col.backlog": "Backlog",
  "cli.simulate.col.reviews": "Reviews",
  "cli.simulate.col.minutes": "Minutes",
  "cli.simulate.col.new": "New cards",
  "cli.simulate.new-offered": "offered",
  "cli.simulate.new-paused": "paused",
  "cli.simulate.cleared": {
    count: "count",
    one: "The backlog of {backlog} review items cleared after {count} session.",
    other:
      "The backlog of {backlog} review items cleared after {count} sessions.",
  },
  "cli.simulate.not-cleared":
    "The backlog of {backlog} review items did not clear within {days} sessions.",

  "cli.error.config-invalid":
    "{file}: {field} is invalid, fix the value and run again",
  "cli.error.config-json":
    "{file} is not valid JSON, fix the syntax and run again",
  "cli.error.event-invalid":
    "A review event has an invalid {field}; nothing was written",
  "cli.error.repository-not-found":
    "No {file} in {root}: point --content at a content repository",
  "cli.error.io-failed":
    "Cannot read or write {file}: check the path and permissions",
  "cli.error.render-failed":
    "Rendering {file} failed: check the Mermaid source",
  "cli.error.missing-command": "Name a command: run wastech-learn --help",
  "cli.error.unknown-command":
    "Unknown command {command}: run wastech-learn --help",
  "cli.error.unknown-option":
    "Unknown option {option}: run wastech-learn --help",
  "cli.error.bad-value":
    "Invalid value {value} for {option}: run wastech-learn --help",
  "cli.error.unexpected": "Unexpected failure: {detail}",
  "cli.error.scheduler-unsupported":
    "learn.config.json names another scheduler: set srs.scheduler to {expected} or use a matching framework version",

  "cli.help": [
    "Usage: wastech-learn <command> [options]",
    "",
    "Commands:",
    "  check      Check content beyond mdlint: limits, cloze, ids, diagrams, preset",
    "  build      Compile the content bundle for the app (--out <file>)",
    "  render     Render diagrams/*.mmd to SVG; --check only lists stale ones",
    "  simulate   Simulate a break and the sessions that clear its backlog",
    "",
    "Options:",
    "  --content <dir>   Content repository (default: current folder)",
    "  --lang <ru|en|pl> Language of the messages (default: uiLanguage of learn.config.json)",
    "  --help            Show this help",
    "",
    "build:    --out <file> (default .cache/content-bundle.json), --built-at <ISO date>",
    "render:   --check",
    "simulate: --cards, --warmup-days, --break-days, --session-minutes, --seed, --runs",
  ].join("\n"),
} as const satisfies Record<string, Message>;

export type MessageKey = keyof typeof en;
