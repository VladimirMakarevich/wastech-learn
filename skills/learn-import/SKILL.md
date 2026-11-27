---
name: learn-import
description: Import a learning package - one Markdown file exported from ChatGPT, Gemini or another chat without MCP and saved in inbox/ of the wastech-learn content repository - into a topic. Parses it with the wastech-learn MCP tools, shows the candidate cards for the learner to pick, writes the topic, summary, materials and diagrams, merges into an existing topic without overwriting it, and archives the package in inbox/done/. Use when the user says "import from inbox", "process the package", "импортируй из inbox", "разбери пакет", "zaimportuj z inbox", or a new file appears in inbox/. Also hands out the export prompt to paste into the other chat. Not for capturing a conversation held here (learn-capture).
compatibility: Needs the wastech-learn MCP server (@wastech-learn/mcp-server) and wastech-mdlint, installed as exact devDependencies of the content repository.
---

# learn-import

A chat without MCP ends its conversation with one Markdown file in a fixed format, the learning package. This skill turns that file into a topic, with the learner choosing the cards: importing without picking would skip the step that makes cards stick.

## The export prompt

When the learner asks how to export from another chat, give them the prompt in their language to paste at the end of that conversation: [English](templates/export-prompt.en.md), [Русский](templates/export-prompt.ru.md), [Polski](templates/export-prompt.pl.md). The prompt's language does not decide the topic's language: the package says it in `lang`. The answer goes into `inbox/<topic>.md` in the content repository.

## Ground rules

- Speak the user's language; artifacts stay in the package's `lang`.
- Change files only through the MCP tools, each write with a `requestId` unique to that write, such as `<topic>-<YYYYMMDD-HHMM>-import-cards`; repeat an id only to retry the same call.
- An existing topic is extended, never overwritten: summary text the learner already has stays where it is.

## Steps

1. **Find the package.** Use the path the user gave, or list `inbox/*.md` (not `inbox/done/`) and ask which one when there are several.
2. **Parse it** with `import_package`. It changes nothing.
   - No `package` in the answer: the front matter is unusable. Say which field to fix, in one line, and stop.
   - Findings about candidate cards or material rows: mention them in one line each; broken candidates can still be fixed in the conversation before picking.
3. **Check for duplicates.** `search` the topic and each candidate's idea. Show what already exists.
4. **Pick the cards.** Draft every candidate into card fields - a short title, the type, bloom and idea from its heading, the topic's summary section in `sources`, `R:` lines as the rubric, `E:` as the explanation - and validate them with `add_cards` and `dryRun: true`, fixing limit findings yourself. Present them as learn-capture does; the learner keeps, edits or drops each, and what they want later gets `status: draft`.
5. **Write.**
   - A new topic (`topicExists: false`): `create_topic` with the package's domain, topic, `lang`, `familiarity` and key idea, `origin: chatgpt` when `source` is chatgpt and `import` otherwise; then `save_summary` with the package's summary sections.
   - An existing topic: `save_summary` with `merge: true`. Empty sections take the imported text; sections that already say something keep it, and the imported version lands under Open questions for the learner to reconcile.
   - `add_cards` with the picked cards and the same `origin`.
   - `save_materials` with the package's materials. Open every link first and drop the ones that do not load. When no row is a primary source (official docs or specification, the project's repository), add 1-3 the way learn-capture does.
   - `save_diagram` for each Mermaid block: a kebab-case name and alt text you write from what the diagram shows. Put the returned `embed` into the summary's Diagram section when that section is empty.
6. **Validate** the topic's files with `validate`; fix what it reports.
7. **Archive** the package with `archive_package` and a `requestId`.
8. **Close** with one line: what was imported and how many cards, as learn-capture does.

## Done when

- The topic's files pass `validate` with 0 errors.
- The learner picked the cards, and only those were written.
- The package is in `inbox/done/`.

## What not to do

- Do not write every candidate without the learner picking; do not activate cards they deferred.
- Do not overwrite a summary section that already has text: merge.
- Do not archive the package before its content is written, and do not delete it.
- Do not fill a section the package left out with your own text unless the learner asks for it.
- Do not change the package file itself; fix problems in the conversation and write the fixed fields through the tools.
