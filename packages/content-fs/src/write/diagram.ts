import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  sha256Hex,
  sourceMarker,
  type SaveDiagramInput,
} from "@wastech-learn/core";
import { npxMermaidRenderer } from "../render.js";
import type { Workspace } from "../workspace.js";
import { applyWrite, blockedBy, type WriteOutcomeOf } from "./apply.js";
import { requireTopic } from "./topic-paths.js";

export interface SavedDiagram {
  readonly paths: readonly string[];
  /** Markdown that shows the diagram from the topic's summary, with its alt text. */
  readonly embed: string;
}

// mermaid-cli reports a syntax error on its first lines; the rest is a stack trace nobody can act on.
const DETAIL_CHARS = 240;

const renderFailure = (error: unknown): string => {
  const stderr =
    typeof error === "object" &&
    error !== null &&
    "stderr" in error &&
    typeof error.stderr === "string"
      ? error.stderr
      : error instanceof Error
        ? error.message
        : String(error);
  const line =
    stderr.split("\n").find((candidate) => candidate.trim() !== "") ?? "";
  return line.trim().slice(0, DETAIL_CHARS);
};

/** A source rendered to SVG, or the first line of Mermaid's complaint about it. */
export type RenderedDiagram =
  | { readonly ok: true; readonly source: string; readonly svg: string }
  | { readonly ok: false; readonly source: string; readonly detail: string };

/**
 * Renders a diagram source in a private temporary folder, never next to the content: a failed or
 * interrupted render must not leave a half-written SVG in the repository. The source hash becomes the
 * SVG's first line, exactly as `render` writes it, so `check` sees the pair as fresh. Rendering can take
 * minutes (the first run fetches mermaid-cli), so a host does it before queuing the write, and other
 * writes are not held up by it.
 */
export const renderDiagram = async (
  workspace: Workspace,
  input: Pick<SaveDiagramInput, "source">,
): Promise<RenderedDiagram> => {
  const renderer = workspace.options.renderer ?? npxMermaidRenderer;
  const source = `${input.source.trim()}\n`;
  const dir = await mkdtemp(join(tmpdir(), "wastech-learn-diagram-"));
  try {
    const sourcePath = join(dir, "diagram.mmd");
    const outputPath = join(dir, "diagram.svg");
    await writeFile(sourcePath, source);
    try {
      await renderer.render(sourcePath, outputPath);
    } catch (error) {
      return { ok: false, source, detail: renderFailure(error) };
    }
    const output = await readFile(outputPath, "utf8");
    return {
      ok: true,
      source,
      svg: `${sourceMarker(await sha256Hex(source))}\n${output}`,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

/**
 * Saves a rendered Mermaid diagram of a topic: the source and its SVG, written together. A source
 * Mermaid could not render is a finding on the source file and nothing is written, so a chat can fix
 * the syntax and call again. A dry run renders too: rendering is the only real syntax check.
 */
export const saveDiagram = async (
  workspace: Workspace,
  input: SaveDiagramInput,
  rendered: RenderedDiagram,
): Promise<WriteOutcomeOf<SavedDiagram>> => {
  const snapshot = await workspace.snapshot();
  const topic = requireTopic(snapshot, input.topic);
  const sourcePath = `${topic.dir}/diagrams/${input.name}.mmd`;
  const svgPath = `${topic.dir}/diagrams/${input.name}.svg`;
  const result: SavedDiagram = {
    paths: [sourcePath, svgPath],
    embed: `![${input.alt.replace(/[[\]]/g, "")}](diagrams/${input.name}.svg)`,
  };
  if (!rendered.ok) {
    return blockedBy(
      [
        {
          ruleId: "diagram-render",
          severity: "error",
          file: sourcePath,
          params: { detail: rendered.detail },
        },
      ],
      result,
    );
  }
  return applyWrite(
    workspace,
    {
      basis: snapshot,
      files: new Map([
        [sourcePath, rendered.source],
        [svgPath, rendered.svg],
      ]),
      result,
    },
    { dryRun: input.dryRun === true },
  );
};
