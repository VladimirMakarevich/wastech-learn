import { YAMLParseError, parse } from "yaml";

export type FrontMatterSplit =
  | {
      readonly ok: true;
      readonly data: unknown;
      readonly body: string;
      /** 1-based file line on which the body starts, to report body positions as file lines. */
      readonly bodyLine: number;
    }
  | { readonly ok: false; readonly reason: "missing" }
  | { readonly ok: false; readonly reason: "yaml"; readonly line: number };

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Separates the YAML front matter from the Markdown body and parses the YAML. */
export const splitFrontMatter = (text: string): FrontMatterSplit => {
  const match = FENCE.exec(text);
  if (match === null) return { ok: false, reason: "missing" };
  const yaml = match[1] ?? "";
  const head = match[0];
  let data: unknown;
  try {
    data = parse(yaml);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      // +1 for the opening fence; the parser counts lines inside the block.
      return {
        ok: false,
        reason: "yaml",
        line: (error.linePos?.[0].line ?? 1) + 1,
      };
    }
    throw error;
  }
  return {
    ok: true,
    data: data ?? {},
    body: text.slice(head.length),
    bodyLine: head.split("\n").length - (head.endsWith("\n") ? 0 : 1),
  };
};
