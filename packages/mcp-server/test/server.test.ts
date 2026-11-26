import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { connect, editJson, goldenCopy } from "./helpers.js";

const ALL_TOOLS = [
  "add_cards",
  "archive_package",
  "create_topic",
  "import_package",
  "queue_status",
  "quiz_next",
  "record_review",
  "reveal",
  "save_diagram",
  "save_materials",
  "save_summary",
  "search",
  "undo_last",
  "update_card",
  "validate",
];

describe("wastech-learn-mcp server", () => {
  it("lists every tool of the MCP tool table and archive_package, with input schemas", async () => {
    const session = await connect(await goldenCopy());
    const { tools } = await session.client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(ALL_TOOLS);
    const addCards = tools.find((tool) => tool.name === "add_cards");
    expect(addCards?.inputSchema.properties).toHaveProperty("requestId");
    expect(addCards?.annotations).toMatchObject({
      readOnlyHint: false,
      idempotentHint: true,
    });
    expect(
      tools.find((tool) => tool.name === "search")?.annotations?.readOnlyHint,
    ).toBe(true);
  });

  it("answers an unknown tool with { code, message, hint }", async () => {
    const session = await connect(await goldenCopy());
    const result = await session.call("suspend", { item: "0d1gjcys:main" });
    expect(result.isError).toBe(true);
    expect(result.body).toEqual({
      code: "TOOL_UNKNOWN",
      message: "Инструмента suspend нет",
      hint: "Запроси список инструментов, чтобы увидеть, что есть у сервера",
    });
  });

  it("answers invalid arguments with INPUT_INVALID and the field", async () => {
    const session = await connect(await goldenCopy());
    const result = await session.call("quiz_next", { limit: 50 });
    expect(result.isError).toBe(true);
    expect(result.body).toMatchObject({
      code: "INPUT_INVALID",
      field: "limit",
    });
  });

  it("speaks the repository's uiLanguage in findings: Polish for uiLanguage pl", async () => {
    const root = await goldenCopy();
    await editJson(root, "learn.config.json", (config) => {
      config.uiLanguage = "pl";
    });
    const session = await connect(root);
    const result = await session.call("add_cards", {
      topic: "architecture/backpressure",
      dryRun: true,
      cards: [
        {
          title: "Too long",
          type: "basic",
          bloom: "remember",
          grading: "self",
          status: "draft",
          question: "[Streaming] What does a consumer send upstream?",
          answer:
            "A demand signal that says how many more items it is ready to take right now.",
          sources: [{ title: "Summary: TL;DR", url: "../summary.md#tldr" }],
        },
      ],
    });
    expect(result.body.findings).toEqual([
      expect.objectContaining({
        rule: "answer-words",
        severity: "error",
        message: "Odpowiedź ma 16 słów, limit dla basic to 12",
      }),
    ]);
  });

  it("keeps network access out of the server code", async () => {
    await expect(fetch("https://example.org")).rejects.toThrow(
      "Network access is disabled",
    );
    const sources = ["../src", "../../content-fs/src", "../../core/src"].map(
      (dir) => fileURLToPath(new URL(dir, import.meta.url)),
    );
    for (const dir of sources) {
      for (const entry of await readdir(dir, {
        recursive: true,
        withFileTypes: true,
      })) {
        if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
        const text = await readFile(join(entry.parentPath, entry.name), "utf8");
        expect([
          entry.name,
          /from "node:(https?|net|dgram|tls)"|\bfetch\(|XMLHttpRequest|anthropic|openai/i.test(
            text,
          ),
        ]).toEqual([entry.name, false]);
      }
    }
  });
});
