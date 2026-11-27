import type {
  SourceFile,
  SourceSaveAnswer,
  SourceSaveBody,
} from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import { ApiError } from "../src/app/data/api";
import { parseSaveAnswer } from "../src/app/data/write-api";
import { EditorModel } from "../src/app/edit/editor-model";
import { lineOffset, sectionLine } from "../src/app/edit/text-position";

const PATH = "content/architecture/backpressure/cards/10dkrwp7.md";
const FILE: SourceFile = {
  path: PATH,
  text: "a\r\nb\n",
  version: "f".repeat(64),
};

const setup = (answers: (SourceSaveAnswer | Error)[], files = [FILE]) => {
  const sent: SourceSaveBody[] = [];
  let refreshed = 0;
  let loads = 0;
  const model = new EditorModel({
    load: () => {
      const file = files[Math.min(loads++, files.length - 1)];
      return file === undefined
        ? Promise.reject(new ApiError("source-not-found", 404, "HTTP 404"))
        : Promise.resolve(file);
    },
    save: (body) => {
      sent.push(body);
      const answer = answers.shift();
      if (answer === undefined) throw new Error("no answer prepared");
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(answer);
    },
    afterWrite: () => {
      refreshed++;
      return Promise.resolve();
    },
  });
  return { model, sent, refreshed: () => refreshed };
};

const SAVED: SourceSaveAnswer = {
  kind: "saved",
  status: "written",
  paths: [PATH],
  card: { id: "10dkrwp7", retired: null },
  findings: [],
  lint: [],
};

describe("EditorModel", () => {
  it("opens a CRLF file as clean text and saves an edit against the opened version", async () => {
    const { model, sent, refreshed } = setup([SAVED]);
    await model.open(PATH);
    expect(model.phase()).toBe("editing");
    expect(model.draft()).toBe("a\nb\n");
    expect(model.dirty()).toBe(false);

    model.setDraft("a\nB\n");
    expect(model.dirty()).toBe(true);
    const result = await model.save();
    expect(sent).toEqual([
      { path: PATH, version: FILE.version, text: "a\nB\n" },
    ]);
    expect(result).toEqual({
      status: "written",
      warnings: [],
      card: { id: "10dkrwp7", retired: null },
    });
    expect(model.phase()).toBe("done");
    // Saved and about to close: the field takes no more typing that the close would drop.
    expect(model.busy()).toBe(true);
    expect(model.dirty()).toBe(false);
    expect(refreshed()).toBe(1);
  });

  it("sends a CRLF file back with CRLF, so an edit changes only its own line", async () => {
    const crlf: SourceFile = { ...FILE, text: "a\r\nb\r\nc\r\n" };
    const { model, sent } = setup([SAVED], [crlf]);
    await model.open(PATH);
    expect(model.draft()).toBe("a\nb\nc\n");
    model.setDraft("a\nB\nc\n");
    await model.save();
    expect(sent[0]?.text).toBe("a\r\nB\r\nc\r\n");
    expect(model.dirty()).toBe(false);
  });

  it("passes on the successor a 'new card' answer names", async () => {
    const { model } = setup([
      { ...SAVED, card: { id: "newcard1", retired: "10dkrwp7" } },
    ]);
    await model.open(PATH);
    model.setDraft("other question");
    expect((await model.save("new"))?.card).toEqual({
      id: "newcard1",
      retired: "10dkrwp7",
    });
  });

  it("closes an untouched file without a request", async () => {
    const { model, sent } = setup([]);
    await model.open(PATH);
    expect(await model.save()).toEqual({
      status: "unchanged",
      warnings: [],
      card: undefined,
    });
    expect(sent).toEqual([]);
  });

  it("lists blocking findings with the open file first and keeps the draft", async () => {
    const { model } = setup([
      {
        kind: "blocked",
        findings: [
          {
            ruleId: "summary-link",
            severity: "error",
            file: "content/x/y/cards/other.md",
            line: 3,
            params: {},
          },
          {
            ruleId: "section-missing",
            severity: "error",
            file: PATH,
            line: 14,
            params: { section: "Answer" },
          },
        ],
        lint: [
          {
            file: PATH,
            line: 2,
            ruleId: "MD012",
            severity: "warning",
            message: "Blank lines",
          },
        ],
      },
    ]);
    await model.open(PATH);
    model.setDraft("broken");
    expect(await model.save()).toBeUndefined();
    expect(model.phase()).toBe("blocked");
    expect(model.draft()).toBe("broken");
    expect(
      model
        .findings()
        .map((finding) => [finding.file, finding.line, finding.here]),
    ).toEqual([
      [PATH, 14, true],
      ["content/x/y/cards/other.md", 3, false],
      [PATH, 2, true],
    ]);
  });

  it("asks about the meaning and sends the answer with the repeated save", async () => {
    const { model, sent } = setup([
      {
        kind: "decision",
        largeEdit: [{ section: "Answer", percent: 60 }],
        removedVariants: [],
      },
      SAVED,
    ]);
    await model.open(PATH);
    model.setDraft("new meaning");
    await model.save();
    expect(model.phase()).toBe("decision");
    expect(model.question()?.largeEdit).toEqual([
      { section: "Answer", percent: 60 },
    ]);
    model.dismissQuestion();
    expect(model.phase()).toBe("editing");
    expect((await model.save("new"))?.status).toBe("written");
    expect(sent[1]?.meaning).toBe("new");
  });

  it("keeps the draft on a conflict and replaces it only on reload", async () => {
    const fresh: SourceFile = {
      path: PATH,
      text: "theirs\n",
      version: "e".repeat(64),
    };
    const { model } = setup(
      [{ kind: "refused", code: "content-changed" }],
      [FILE, fresh],
    );
    await model.open(PATH);
    model.setDraft("mine\n");
    await model.save();
    expect(model.phase()).toBe("conflict");
    expect(model.draft()).toBe("mine\n");
    await model.reload();
    expect(model.phase()).toBe("editing");
    expect(model.draft()).toBe("theirs\n");
    expect(model.dirty()).toBe(false);
  });

  it("names a missing file and a failed call without losing the text", async () => {
    const { model } = setup([new ApiError("unreachable", 0, "offline")], []);
    await model.open(PATH);
    expect(model.phase()).toBe("missing");

    const other = setup([new ApiError("unreachable", 0, "offline")]);
    await other.model.open(PATH);
    other.model.setDraft("mine");
    await other.model.save();
    expect(other.model.phase()).toBe("failed");
    expect(other.model.failure()).toEqual({
      code: "unreachable",
      during: "save",
    });
    expect(other.model.draft()).toBe("mine");
  });

  it("drops the previous file when another one fails to open, so nothing can be saved under its name", async () => {
    const index: SourceFile = {
      path: "content/architecture/backpressure/index.md",
      text: "index\n",
      version: "d".repeat(64),
    };
    let loads = 0;
    const model = new EditorModel({
      load: () =>
        loads++ === 0
          ? Promise.resolve(index)
          : Promise.reject(new ApiError("http", 500, "HTTP 500")),
      save: () => Promise.reject(new Error("nothing may be sent")),
      afterWrite: () => Promise.resolve(),
    });
    await model.open(index.path);
    model.setDraft("index, edited\n");
    await model.open(PATH);
    expect(model.phase()).toBe("failed");
    expect(model.failure()).toEqual({ code: "http", during: "load" });
    expect(model.draft()).toBe("");
    expect(model.dirty()).toBe(false);
    expect(await model.save()).toBeUndefined();
  });
});

describe("the editor's text helpers", () => {
  it("find a section's heading line and a line's offset", () => {
    const text = "---\nx: 1\n---\n\n## TL;DR\n\nA\n\n## Trade-offs\n\nB\n";
    expect(sectionLine(text, "Trade-offs")).toBe(8);
    expect(sectionLine(text, "Nope")).toBe(0);
    expect(lineOffset(text, 1)).toBe(0);
    expect(lineOffset(text, 2)).toBe(4);
    expect(lineOffset(text, 99)).toBe(text.length);
  });
});

describe("parseSaveAnswer", () => {
  it("accepts each answer only with its status code", () => {
    expect(
      parseSaveAnswer(200, {
        status: "written",
        paths: [],
        findings: [],
        lint: [],
      }).kind,
    ).toBe("saved");
    expect(
      parseSaveAnswer(422, { status: "blocked", findings: [], lint: [] }).kind,
    ).toBe("blocked");
    expect(
      parseSaveAnswer(409, {
        code: "decision-needed",
        largeEdit: [],
        removedVariants: ["c2"],
      }),
    ).toEqual({ kind: "decision", largeEdit: [], removedVariants: ["c2"] });
    expect(parseSaveAnswer(409, { code: "content-changed" })).toEqual({
      kind: "refused",
      code: "content-changed",
    });
    expect(() =>
      parseSaveAnswer(409, {
        status: "written",
        paths: [],
        findings: [],
        lint: [],
      }),
    ).toThrow(ApiError);
    expect(() => parseSaveAnswer(200, { nonsense: true })).toThrow(ApiError);
    expect(parseSaveAnswer(413, { code: "body-too-large" })).toEqual({
      kind: "refused",
      code: "body-too-large",
    });
  });
});
