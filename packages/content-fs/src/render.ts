import { execFile } from "node:child_process";
import { glob, readFile, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { promisify } from "node:util";
import {
  LearnError,
  markerHash,
  sha256Hex,
  sourceMarker,
} from "@wastech-learn/core";

const run = promisify(execFile);

/** Turns one Mermaid source into an SVG file; swapped for a stub in tests, which have no browser. */
export interface Renderer {
  readonly render: (sourcePath: string, outputPath: string) => Promise<void>;
}

/**
 * mermaid-cli pulls in a headless Chromium, far too heavy to be a dependency of every install. It runs
 * through npx at an exact version only when someone actually renders.
 */
export const MERMAID_CLI = "@mermaid-js/mermaid-cli@11.12.0";

export const npxMermaidRenderer: Renderer = {
  render: async (sourcePath, outputPath) => {
    await run(
      "npx",
      [
        "-y",
        MERMAID_CLI,
        "-q",
        "-b",
        "white",
        "-i",
        sourcePath,
        "-o",
        outputPath,
      ],
      {
        maxBuffer: 16 * 1024 * 1024,
      },
    );
  },
};

export interface RenderReport {
  readonly total: number;
  /** SVGs written in this run. */
  readonly rendered: readonly string[];
  /** SVGs older than their source; in check mode they are only listed. */
  readonly stale: readonly string[];
}

const toPosix = (path: string): string =>
  sep === "/" ? path : path.split(sep).join("/");

const readOptional = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return undefined;
    throw error;
  }
};

/**
 * Renders every Mermaid source under a topic's `diagrams/` whose SVG is missing or older than it, and writes
 * the source's hash as the SVG's first line: `check` and `render --check` compare that line, not file
 * times, which git does not keep.
 */
export const renderDiagrams = async (
  root: string,
  options: { readonly check: boolean; readonly renderer?: Renderer },
): Promise<RenderReport> => {
  const renderer = options.renderer ?? npxMermaidRenderer;
  const sources: string[] = [];
  for await (const path of glob("content/**/diagrams/*.mmd", { cwd: root }))
    sources.push(toPosix(path));
  sources.sort();
  const rendered: string[] = [];
  const stale: string[] = [];
  for (const source of sources) {
    const svg = source.replace(/\.mmd$/, ".svg");
    let hash: string;
    let current: string | undefined;
    try {
      hash = await sha256Hex(await readFile(join(root, source), "utf8"));
      current = await readOptional(join(root, svg));
    } catch (error) {
      throw new LearnError(
        "io-failed",
        `Cannot read ${source}`,
        { file: source },
        { cause: error },
      );
    }
    if (current !== undefined && markerHash(current) === hash) continue;
    if (options.check) {
      stale.push(svg);
      continue;
    }
    try {
      await renderer.render(join(root, source), join(root, svg));
    } catch (error) {
      throw new LearnError(
        "render-failed",
        `Rendering ${source} failed`,
        { file: source },
        { cause: error },
      );
    }
    const output = (await readOptional(join(root, svg))) ?? "";
    await writeFile(join(root, svg), `${sourceMarker(hash)}\n${output}`);
    rendered.push(svg);
  }
  return { total: sources.length, rendered, stale };
};
