import {
  runIdempotent,
  type Study,
  type WriteOutcomeOf,
  type Workspace,
} from "@wastech-learn/content-fs";
import {
  MUTATING_TOOLS,
  TOOL_INPUT_SCHEMAS,
  firstIssue,
  requestLifetimeMs,
  type MutationInput,
  type ToolInput,
  type ToolName,
  type UiLanguage,
} from "@wastech-learn/core";
import { InputError, writeResponse } from "./respond.js";

/** What every tool reaches: the repository held open, its quiz, and the learner's language. */
export interface ToolContext {
  readonly workspace: Workspace;
  readonly study: Study;
  readonly lang: () => Promise<UiLanguage>;
}

export interface Tool {
  readonly name: ToolName;
  readonly description: string;
  readonly mutating: boolean;
  /** Parses the raw arguments with the tool's schema and runs it; throws on any failure. */
  readonly call: (raw: unknown, ctx: ToolContext) => Promise<unknown>;
}

/**
 * Binds a tool name to its handler. The input is parsed once, here, with the schema the core owns for that
 * name; the handler receives typed values and never sees raw JSON.
 */
export const defineTool = <Name extends ToolName>(
  name: Name,
  description: string,
  run: (input: ToolInput<Name>, ctx: ToolContext) => Promise<unknown>,
): Tool => ({
  name,
  description,
  mutating: MUTATING_TOOLS.has(name),
  call: async (raw, ctx) => {
    const schema = TOOL_INPUT_SCHEMAS[name];
    const parsed = schema.safeParse(raw ?? {});
    if (!parsed.success) {
      const issue = firstIssue(parsed.error);
      throw new InputError(issue.field, issue.message);
    }
    // The schema indexed by `Name` parses to exactly `ToolInput<Name>`; TypeScript cannot follow the index.
    return run(parsed.data as ToolInput<Name>, ctx);
  },
});

/**
 * Runs a write once per `requestId`: a retry gets the first answer and writes nothing. A dry run is not
 * remembered, since it wrote nothing that a retry could duplicate. Writes of one repository run one at a
 * time, the request lookup included: a chat may send calls in parallel, and two writes planned from the
 * same snapshot would each rewrite a shared file such as a topic's index.
 */
export const idempotent = async (
  ctx: ToolContext,
  name: ToolName,
  input: MutationInput & Readonly<Record<string, unknown>>,
  write: () => Promise<{
    readonly payload: unknown;
    readonly written: boolean;
  }>,
): Promise<unknown> => {
  const { requestId } = input;
  return ctx.workspace.exclusive(async () => {
    if (input.dryRun === true || requestId === undefined)
      return (await write()).payload;
    return runIdempotent(
      ctx.workspace.root,
      {
        tool: name,
        requestId,
        input,
        now: ctx.workspace.options.now(),
        lifetimeMs: requestLifetimeMs(name),
      },
      async () => {
        const { payload, written } = await write();
        return { result: payload, written };
      },
    );
  });
};

/** A content write: validated, written once per request id, answered with paths, ids and findings. */
export const contentWrite = <Result extends object>(
  ctx: ToolContext,
  name: ToolName,
  input: MutationInput & Readonly<Record<string, unknown>>,
  write: () => Promise<WriteOutcomeOf<Result>>,
): Promise<unknown> =>
  idempotent(ctx, name, input, async () => {
    const outcome = await write();
    return {
      payload: writeResponse(outcome, await ctx.lang()),
      written: outcome.status === "written",
    };
  });
