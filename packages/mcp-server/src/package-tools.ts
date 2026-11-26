import { archivePackage, importPackage } from "@wastech-learn/content-fs";
import { formatFinding } from "@wastech-learn/core";
import { defineTool, idempotent, type Tool } from "./tool.js";

export const packageTools: readonly Tool[] = [
  defineTool(
    "import_package",
    "Parse a learning package from inbox/ (exported from a chat without MCP) and return its topic, summary sections, materials, diagrams and candidate cards. Changes nothing: write what the learner picks with the content tools, then call archive_package.",
    async (input, ctx) => {
      const imported = await importPackage(ctx.workspace, input);
      const lang = await ctx.lang();
      return {
        path: imported.path,
        topicExists: imported.topicExists,
        package: imported.package,
        findings: imported.findings.map((finding) => ({
          file: finding.file,
          ...(finding.line === undefined ? {} : { line: finding.line }),
          rule: finding.ruleId,
          severity: finding.severity,
          message: formatFinding(lang, finding),
        })),
      };
    },
  ),
  defineTool(
    "archive_package",
    "Move an imported package from inbox/ to inbox/done/ once its cards were picked and written. Needs a requestId; repeating it does not move anything twice. dryRun shows the target path.",
    (input, ctx) =>
      idempotent(ctx, "archive_package", input, async () => {
        const archived = await archivePackage(ctx.workspace, input);
        return {
          payload: {
            status: input.dryRun === true ? "dry-run" : "written",
            ...archived,
          },
          written: input.dryRun !== true,
        };
      }),
  ),
];
