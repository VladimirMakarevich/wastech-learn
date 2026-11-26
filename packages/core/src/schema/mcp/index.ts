import { z } from "zod";
import {
  addCardsInputSchema,
  createTopicInputSchema,
  saveDiagramInputSchema,
  saveMaterialsInputSchema,
  saveSummaryInputSchema,
  searchInputSchema,
  updateCardInputSchema,
  validateInputSchema,
} from "./content.js";
import {
  archivePackageInputSchema,
  importPackageInputSchema,
} from "./package.js";
import {
  queueStatusInputSchema,
  quizNextInputSchema,
  recordReviewInputSchema,
  revealInputSchema,
  undoLastInputSchema,
} from "./quiz.js";

/**
 * Every MCP tool and the one schema its input is parsed with. The set is fixed here, in the core, so a
 * future host offering the same tools (remote MCP, a local HTTP route) validates exactly the same way.
 */
export const TOOL_INPUT_SCHEMAS = {
  create_topic: createTopicInputSchema,
  add_cards: addCardsInputSchema,
  update_card: updateCardInputSchema,
  save_summary: saveSummaryInputSchema,
  save_materials: saveMaterialsInputSchema,
  save_diagram: saveDiagramInputSchema,
  validate: validateInputSchema,
  search: searchInputSchema,
  import_package: importPackageInputSchema,
  archive_package: archivePackageInputSchema,
  queue_status: queueStatusInputSchema,
  quiz_next: quizNextInputSchema,
  reveal: revealInputSchema,
  record_review: recordReviewInputSchema,
  undo_last: undoLastInputSchema,
} as const;

export type ToolName = keyof typeof TOOL_INPUT_SCHEMAS;
export type ToolInput<Name extends ToolName> = z.infer<
  (typeof TOOL_INPUT_SCHEMAS)[Name]
>;

export const TOOL_NAMES = Object.keys(
  TOOL_INPUT_SCHEMAS,
) as readonly ToolName[];

export const isToolName = (name: string): name is ToolName =>
  Object.hasOwn(TOOL_INPUT_SCHEMAS, name);

/** Tools that write; each one takes `requestId` and `dryRun` and is idempotent by the former. */
export const MUTATING_TOOLS: ReadonlySet<ToolName> = new Set([
  "create_topic",
  "add_cards",
  "update_card",
  "save_summary",
  "save_materials",
  "save_diagram",
  "archive_package",
  "record_review",
  "undo_last",
]);

const MINUTE_MS = 60_000;

/**
 * How long a repeated `requestId` counts as a retry of the same write. A client retries within
 * seconds or after a restart, so a day covers content writes; a quiz rating repeated later is a new
 * answer to record, so ratings and undos are retries only for a few minutes.
 */
export const requestLifetimeMs = (name: ToolName): number =>
  name === "record_review" || name === "undo_last"
    ? 10 * MINUTE_MS
    : 24 * 60 * MINUTE_MS;

/**
 * The JSON Schema a client sees for a tool's input. It describes what the client may send, so defaults
 * show as optional fields, while parsing still applies them.
 */
export const toolInputJsonSchema = (name: ToolName): Record<string, unknown> =>
  z.toJSONSchema(TOOL_INPUT_SCHEMAS[name], { io: "input" });
