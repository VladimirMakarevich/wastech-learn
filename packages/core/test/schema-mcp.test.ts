import { describe, expect, it } from "vitest";
import {
  MUTATING_TOOLS,
  TOOL_INPUT_SCHEMAS,
  TOOL_NAMES,
  isToolName,
  toolInputJsonSchema,
} from "../src/index.js";

describe("MCP tool input schemas", () => {
  it("cover every tool of the MCP server, archive_package included", () => {
    expect([...TOOL_NAMES].sort()).toEqual(
      [
        "create_topic",
        "add_cards",
        "update_card",
        "save_summary",
        "save_materials",
        "save_diagram",
        "validate",
        "search",
        "import_package",
        "archive_package",
        "queue_status",
        "quiz_next",
        "reveal",
        "record_review",
        "undo_last",
      ].sort(),
    );
    expect(isToolName("suspend")).toBe(false);
  });

  it("require a requestId for a write and not for a dry run", () => {
    const card = {
      title: "T",
      type: "basic",
      bloom: "remember",
      grading: "self",
      status: "draft",
      question: "[X] Q?",
      answer: "A.",
    };
    const schema = TOOL_INPUT_SCHEMAS.add_cards;
    expect(
      schema.safeParse({ topic: "arch/flow", cards: [card], dryRun: true })
        .success,
    ).toBe(true);
    const write = schema.safeParse({ topic: "arch/flow", cards: [card] });
    expect(write.success).toBe(false);
    expect(write.error?.issues[0]?.path).toEqual(["requestId"]);
    expect(
      schema.safeParse({ topic: "arch/flow", cards: [card], requestId: "r-1" })
        .data?.origin,
    ).toBe("claude-code");
  });

  it("reject unknown fields, so a typo is reported instead of ignored", () => {
    expect(TOOL_INPUT_SCHEMAS.quiz_next.safeParse({ limt: 3 }).success).toBe(
      false,
    );
  });

  it("cap a quiz batch at ten items and default to five", () => {
    expect(TOOL_INPUT_SCHEMAS.quiz_next.safeParse({ limit: 11 }).success).toBe(
      false,
    );
    expect(TOOL_INPUT_SCHEMAS.quiz_next.parse({})).toEqual({
      limit: 5,
      mode: "review",
    });
  });

  it("require alt text for a diagram", () => {
    const result = TOOL_INPUT_SCHEMAS.save_diagram.safeParse({
      topic: "arch/flow",
      name: "flow",
      format: "mermaid",
      source: "flowchart LR\n  A --> B",
      alt: " ",
      dryRun: true,
    });
    expect(result.error?.issues[0]?.path).toEqual(["alt"]);
  });

  it("publish defaults as optional in the JSON Schema clients see", () => {
    const schema = toolInputJsonSchema("quiz_next");
    expect(schema).toMatchObject({
      type: "object",
      properties: { limit: { maximum: 10 } },
    });
    expect(schema.required ?? []).toEqual([]);
    for (const name of MUTATING_TOOLS) {
      expect(Object.keys(toolInputJsonSchema(name).properties ?? {})).toContain(
        "requestId",
      );
    }
  });
});
