import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool as ListedTool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createStudy,
  openWorkspace,
  readUiLanguage,
  type WorkspaceOptions,
} from "@wastech-learn/content-fs";
import {
  isToolName,
  toolInputJsonSchema,
  type UiLanguage,
} from "@wastech-learn/core";
import { contentTools } from "./content-tools.js";
import { packageTools } from "./package-tools.js";
import { quizTools } from "./quiz-tools.js";
import { failure, success, toolErrorOf, unknownTool } from "./respond.js";
import type { Tool, ToolContext } from "./tool.js";

export const SERVER_NAME = "wastech-learn";

/** The server as a host drives it: attach a transport, close it. */
export interface LearnServer {
  readonly connect: (transport: Transport) => Promise<void>;
  readonly close: () => Promise<void>;
}

const serverVersion = (): string => {
  const manifest: unknown = createRequire(import.meta.url)("../package.json");
  return typeof manifest === "object" &&
    manifest !== null &&
    "version" in manifest &&
    typeof manifest.version === "string"
    ? manifest.version
    : "0.0.0";
};

/** Every tool of the server; the set is fixed and matches the input schemas the core owns. */
export const TOOLS: readonly Tool[] = [
  ...contentTools,
  ...packageTools,
  ...quizTools,
];

const listed = (tool: Tool): ListedTool => ({
  name: tool.name,
  description: tool.description,
  inputSchema: { ...toolInputJsonSchema(tool.name), type: "object" },
  annotations: {
    readOnlyHint: !tool.mutating,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
});

/**
 * Builds the MCP server over one content repository. The low-level server is used on purpose: the
 * high-level one answers an unknown tool or invalid arguments with a protocol error in English, while
 * here every failure, including those, comes back as `{ code, message, hint }` in the learner's language.
 */
export const createLearnServer = (options: WorkspaceOptions): LearnServer => {
  const workspace = openWorkspace(options);
  const lang = async (): Promise<UiLanguage> =>
    (await readUiLanguage(options.root)) ?? "en";
  const ctx: ToolContext = { workspace, study: createStudy(workspace), lang };
  const byName = new Map(TOOLS.map((tool) => [tool.name, tool]));
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the low-level server is the documented way to own tools/list and tools/call, see the comment above.
  const server = new Server(
    { name: SERVER_NAME, version: serverVersion() },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: TOOLS.map(listed),
  }));
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
      const { name, arguments: raw } = request.params;
      const tool = isToolName(name) ? byName.get(name) : undefined;
      if (tool === undefined) return failure(unknownTool(name, await lang()));
      try {
        return success(await tool.call(raw, ctx));
      } catch (error) {
        return failure(toolErrorOf(error, await lang()));
      }
    },
  );
  return {
    connect: (transport) => server.connect(transport),
    close: () => server.close(),
  };
};
