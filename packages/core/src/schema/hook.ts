import { z } from "zod";

/**
 * The part of a Claude Code `PostToolUse` event the content hook reads: which tool ran and on which file.
 * Everything else in the event is the agent's business and passes through unread, so a newer Claude Code
 * adding fields does not break the hook.
 */
export const postToolUseEventSchema = z.looseObject({
  tool_name: z.string(),
  tool_input: z.looseObject({ file_path: z.string().optional() }),
  cwd: z.string().optional(),
});
export type PostToolUseEvent = z.infer<typeof postToolUseEventSchema>;
