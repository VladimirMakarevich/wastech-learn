import {
  addCards,
  createTopic,
  renderDiagram,
  saveDiagram,
  saveMaterials,
  saveSummary,
  updateCard,
  validateFiles,
} from "@wastech-learn/content-fs";
import { reportedFindings } from "./respond.js";
import { contentWrite, defineTool, type Tool } from "./tool.js";

const WRITE_NOTE =
  "Validates with wastech-mdlint and check before writing and writes nothing on errors. Pass dryRun: true to see findings and future paths without writing; a real write needs a requestId, and repeating it returns the first result.";

export const contentTools: readonly Tool[] = [
  defineTool(
    "create_topic",
    `Create a topic folder with index.md (key idea, pretest), an empty summary.md template and an empty materials.md. ${WRITE_NOTE}`,
    (input, ctx) =>
      contentWrite(ctx, "create_topic", input, () =>
        createTopic(ctx.workspace, input),
      ),
  ),
  defineTool(
    "add_cards",
    `Add cards the learner picked to a topic: new random ids, files cards/<id>.md, links in the topic's ## Cards. Call with dryRun first to validate candidates. ${WRITE_NOTE}`,
    (input, ctx) =>
      contentWrite(ctx, "add_cards", input, () =>
        addCards(ctx.workspace, input),
      ),
  ),
  defineTool(
    "update_card",
    `Edit a card by id. A wording fix keeps the id; with meaningChanged: true the card is retired and a successor with a new id gets the new text. ${WRITE_NOTE}`,
    (input, ctx) =>
      contentWrite(ctx, "update_card", input, () =>
        updateCard(ctx.workspace, input),
      ),
  ),
  defineTool(
    "save_summary",
    `Write sections of a topic's summary.md by their template names; sections left out keep their text. With merge: true (importing into an existing topic) a section that already has text keeps it and the new text goes under Open questions. ${WRITE_NOTE}`,
    (input, ctx) =>
      contentWrite(ctx, "save_summary", input, () =>
        saveSummary(ctx.workspace, input),
      ),
  ),
  defineTool(
    "save_materials",
    `Append materials (title, url, kind, why, status) to a topic's materials.md; links already listed are kept as they are. ${WRITE_NOTE}`,
    (input, ctx) =>
      contentWrite(ctx, "save_materials", input, () =>
        saveMaterials(ctx.workspace, input),
      ),
  ),
  defineTool(
    "save_diagram",
    `Save a Mermaid diagram with alt text as diagrams/<name>.mmd and its rendered SVG; returns the Markdown to embed it. A syntax error comes back as a finding. ${WRITE_NOTE}`,
    async (input, ctx) => {
      // Rendered before the write queue: a first render fetches mermaid-cli and can take minutes, and
      // quiz ratings must not wait behind it.
      const rendered = await renderDiagram(ctx.workspace, input);
      return contentWrite(ctx, "save_diagram", input, () =>
        saveDiagram(ctx.workspace, input, rendered),
      );
    },
  ),
  defineTool(
    "validate",
    "Check files on disk (paths) or drafts (path and content) with wastech-mdlint and check against the whole repository, without writing.",
    async (input, ctx) => {
      const report = await validateFiles(ctx.workspace, input);
      const { findings, omitted } = reportedFindings(report, await ctx.lang());
      return {
        errors: report.errorCount,
        warnings: report.warningCount,
        findings,
        ...(omitted === 0 ? {} : { omitted }),
      };
    },
  ),
  defineTool(
    "search",
    "Search topics and cards by words (lexical, prefixes, Polish without diacritics); filter by domain, card type or status. Use it to find duplicates before proposing cards.",
    async (input, ctx) => {
      const index = await ctx.workspace.searchIndex();
      return {
        hits: index.search(input.query, {
          domain: input.domain,
          type: input.type,
          status: input.status,
          limit: input.limit,
        }),
      };
    },
  ),
];
