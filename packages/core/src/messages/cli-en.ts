import type { Message } from "./types.js";

/**
 * The command line's messages, kept apart from the catalog of findings, errors and hints the other
 * hosts share. The English set defines the keys; the Russian and Polish sets are typed against it.
 */
export const cliEn = {
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

export type CliMessageKey = keyof typeof cliEn;
