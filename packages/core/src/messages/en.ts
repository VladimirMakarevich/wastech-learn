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
  "finding.cloze-unclosed": {
    count: "count",
    one: "{count} cloze gap has no closing }}: close it",
    other: "{count} cloze gaps have no closing }}: close them",
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
  "finding.card-id-changed":
    "The id stays {id}: the card's review history is kept under it",
  "finding.preset-invalid":
    "Not a valid wastech-mdlint config: copy the preset that ships with the CLI",
  "finding.preset-drift":
    "Preset rule {rule} (#{position}) is missing or changed: restore it from the CLI preset",

  "finding.diagram-render": "Mermaid could not render this source: {detail}",
  "finding.package-card":
    "Candidate card {card} has a missing or invalid {field}: fix it in the package",
  "finding.package-material":
    "A materials row has a missing or invalid {field}: fix the table row",
  "finding.package-summary-section":
    "Summary section {section} is not in the template: rename it or drop it",
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

  "error.path-outside-content": "{subject} is outside the content repository",
  "error.request-id-reused":
    "requestId {subject} was already used for a different call",
  "error.item-not-active": "{subject} is not a review item of an active card",
  "error.topic-exists": "Topic {subject} already exists",
  "error.topic-not-found": "Topic {subject} does not exist",
  "error.card-not-found": "There is no card with id {subject}",
  "error.package-not-found": "There is no learning package at {subject}",
  "error.nothing-to-undo": "There is no review from this device to undo",
  "error.nothing-to-restore":
    "Card {subject} is not deleted since the last commit, so there is nothing to bring back",
  "error.content-changed":
    "{subject} changed while the write was being prepared; nothing was written",
  "error.source-not-found":
    "{subject} is not a topic or card file the app can edit",
  "error.search-index-invalid":
    "The content bundle has a search index this version cannot read",
  "error.id-unavailable":
    "No new id could be made: the random source or the clock gave {subject}",
  "error.input-invalid": "Input field {field} is invalid",
  "error.tool-unknown": "There is no tool named {subject}",
  "error.config-invalid": "{file}: {field} is invalid",
  "error.config-json": "{file} is not valid JSON",
  "hint.config-json": "Fix the syntax of the file and call again",
  "error.event-invalid":
    "A review event has an invalid {field}; nothing was written",
  "error.repository-not-found":
    "No {file} in the content folder this server was started with",
  "error.io-failed": "Cannot read or write {file}",
  "error.render-failed": "Rendering {file} failed",
  "error.scheduler-unsupported":
    "learn.config.json names another scheduler than {expected}",
  "error.unexpected": "Unexpected failure: {detail}",

  "hint.path-outside-content":
    "Pass a path relative to the repository root, without .. or links that lead out of it",
  "hint.request-id-reused":
    "Use a new requestId for a changed call; repeat an id only with the same input",
  "hint.item-not-active":
    "Take items from quiz_next: draft and retired cards are not reviewed",
  "hint.topic-exists":
    "Add to it with add_cards, save_summary and save_materials",
  "hint.topic-not-found":
    "Create it with create_topic first, or find its <domain>/<topic> with search",
  "hint.card-not-found": "Find the card's id with search",
  "hint.package-not-found":
    "Pass the path of a file in inbox/, such as inbox/topic.md",
  "hint.nothing-to-undo":
    "Only reviews recorded with record_review on this device can be undone here",
  "hint.nothing-to-restore":
    "A deletion can be undone only until it is committed; after that, git history keeps the file",
  "hint.content-changed":
    "Someone saved the file in the meantime: call the tool again to build on the new text",
  "hint.source-not-found":
    "Open the file from a topic or a card shown in the app",
  "hint.search-index-invalid":
    "Rebuild the bundle with wastech-learn build or restart wastech-learn serve",
  "hint.id-unavailable":
    "Check the computer's clock and call again; if it happens again, it is a bug in wastech-learn",
  "hint.input-invalid": "Fix that field and call the tool again",
  "hint.tool-unknown": "List the tools to see what this server offers",
  "hint.config-invalid": "Fix the value in the file and call again",
  "hint.event-invalid": "Check the rating and the review item, then call again",
  "hint.repository-not-found":
    "Start the server with --content pointing at a content repository",
  "hint.io-failed": "Check that the file exists and can be written",
  "hint.render-failed":
    "Check that npx can run mermaid-cli on this machine, then call again",
  "hint.scheduler-unsupported":
    "Set srs.scheduler to the version this framework ships with, or update the framework",
  "hint.unexpected":
    "Nothing was written; tell the framework's author what led to it",

  "cli.check.summary": "{files}, {errors}, {warnings}",
  "cli.check.clean": "{cards} checked, no findings",
  "cli.build.written": "Bundle written to {file}: {topics}, {cards}",
  "cli.build.blocked": "Bundle not written: fix the errors above and run again",
  "cli.serve.listening":
    "wastech-learn is open at {url}; press Ctrl+C to stop the server",
  "cli.serve.built": "Bundle built in {ms} ms: {topics}, {cards}",
  "cli.serve.build-failed":
    "Bundle not rebuilt ({errors}); the app keeps the previous one and shows where",
  "cli.serve.watch-failed":
    "Live updates stopped: {detail}. Restart wastech-learn serve to get them back",
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
  "cli.error.port-in-use":
    "Port {port} is already in use: start with --port <another port> or stop the program that holds it",
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

  "cli.hook.findings": "{file} has findings: fix them before going on",
  "cli.hook.failed": "The content check did not run: {detail}",
  "cli.hook.bad-event":
    "No tool event on stdin: run this command from a PostToolUse hook",

  "cli.help": [
    "Usage: wastech-learn <command> [options]",
    "",
    "Commands:",
    "  check      Check content beyond mdlint: limits, cloze, ids, diagrams, preset",
    "  build      Compile the content bundle for the app (--out <file>)",
    "  render     Render diagrams/*.mmd to SVG; --check only lists stale ones",
    "  simulate   Simulate a break and the sessions that clear its backlog",
    "  new-id     Print new card ids (--count <n>, default 1)",
    "  hook       post-tool-use: check a file an agent just wrote (event JSON on stdin)",
    "  serve      Open the app in the browser over a local server on 127.0.0.1",
    "",
    "Options:",
    "  --content <dir>   Content repository (default: current folder)",
    "  --lang <ru|en|pl> Language of the messages (default: uiLanguage of learn.config.json)",
    "  --help            Show this help",
    "",
    "build:    --out <file> (default .cache/content-bundle.json), --built-at <ISO date>",
    "render:   --check",
    "simulate: --cards, --warmup-days, --break-days, --session-minutes, --seed, --runs",
    "serve:    --port <n> (default 4747), --no-open",
  ].join("\n"),
} as const satisfies Record<string, Message>;

export type MessageKey = keyof typeof en;
