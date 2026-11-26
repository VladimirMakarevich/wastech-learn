import type { Element, Root as HastRoot } from "hast";
import { toString } from "mdast-util-to-string";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { bundledLanguages, createHighlighter } from "shiki";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { sha256Hex } from "../hash.js";
import { parseMarkdown } from "../parse/markdown.js";
import { resolveRelative } from "../paths.js";
import { clozeToSpans } from "./cloze.js";
import { sanitizeSchema } from "./sanitize-schema.js";
import { diagramFigure, prepareSvg } from "./svg.js";

const THEMES = { light: "github-light", dark: "github-dark" } as const;

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

/** Turns a Markdown fragment of a content file into sanitized HTML. */
export interface MarkdownRenderer {
  readonly render: (markdown: string, fromFile: string) => string;
  /** Local non-SVG images met so far, by repository path. */
  readonly assets: () => Readonly<Record<string, string>>;
}

const isKnownLanguage = (lang: string): boolean => lang in bundledLanguages;

/** Languages of every fenced code block in the given Markdown, so the highlighter loads only those. */
export const codeLanguages = (
  markdown: readonly string[],
): readonly string[] => {
  const langs = new Set<string>();
  for (const text of markdown) {
    visit(parseMarkdown(text), "code", (code) => {
      if (
        code.lang !== null &&
        code.lang !== undefined &&
        isKnownLanguage(code.lang)
      )
        langs.add(code.lang);
    });
  }
  return [...langs].sort();
};

const classNames = (element: Element): readonly string[] => {
  const value = element.properties.className;
  return Array.isArray(value) ? value.map(String) : [];
};

// Shiki writes HTML attribute names (`class`, `tabindex`) into hast properties; the sanitizer only knows
// hast property names and would strip the theme classes and the keyboard scroll stop.
const normalizeProperties = (root: HastRoot): void => {
  visit(root, "element", (node) => {
    const { class: className, tabindex: tabIndex, ...rest } = node.properties;
    node.properties = {
      ...rest,
      ...(className === undefined
        ? {}
        : { className: String(className).split(/\s+/).filter(Boolean) }),
      ...(tabIndex === undefined ? {} : { tabIndex: Number(tabIndex) }),
    };
  });
};

const rehypeShiki = (highlighter: Highlighter) => () => (tree: HastRoot) => {
  visit(tree, "element", (node, index, parent) => {
    if (node.tagName !== "pre" || parent === undefined || index === undefined)
      return;
    const code = node.children.find(
      (child): child is Element =>
        child.type === "element" && child.tagName === "code",
    );
    if (code === undefined) return;
    const lang = classNames(code)
      .find((name) => name.startsWith("language-"))
      ?.slice("language-".length);
    const highlighted = highlighter.codeToHast(
      toString(code).replace(/\n$/, ""),
      {
        lang:
          lang !== undefined && highlighter.getLoadedLanguages().includes(lang)
            ? lang
            : "text",
        themes: THEMES,
        // Both themes as CSS variables: the page picks light or dark, not the build.
        defaultColor: false,
      },
    );
    normalizeProperties(highlighted);
    const pre = highlighted.children[0];
    if (pre?.type === "element") parent.children[index] = pre;
  });
};

interface DiagramContext {
  readonly files: ReadonlyMap<string, string>;
  readonly diagramIds: ReadonlyMap<string, string>;
  readonly embeds: Map<string, number>;
  readonly assets: Map<string, string>;
}

// Links leave the app in a new tab without handing it a reference to the page.
const EXTERNAL = /^https?:\/\//;

const rehypeContentLinks =
  (context: DiagramContext) =>
  () =>
  (tree: HastRoot, file: { path?: string }) => {
    const fromFile = file.path ?? "";
    visit(tree, "element", (node, index, parent) => {
      if (
        node.tagName === "a" &&
        typeof node.properties.href === "string" &&
        EXTERNAL.test(node.properties.href)
      ) {
        node.properties.rel = ["noopener", "noreferrer"];
        node.properties.target = "_blank";
        return;
      }
      if (node.tagName !== "img" || parent === undefined || index === undefined)
        return;
      const src = node.properties.src;
      if (typeof src === "string" && EXTERNAL.test(src)) {
        // A remote image would make the app fetch from a third party on every render; the alt text
        // keeps the meaning without the request.
        const alt =
          typeof node.properties.alt === "string" ? node.properties.alt : "";
        parent.children[index] = { type: "text", value: alt };
        return;
      }
      const path =
        typeof src === "string" ? resolveRelative(fromFile, src) : undefined;
      if (path === undefined) return;
      const svgText = path.endsWith(".svg")
        ? context.files.get(path)
        : undefined;
      const baseId = context.diagramIds.get(path);
      if (svgText !== undefined && baseId !== undefined) {
        const embed = (context.embeds.get(path) ?? 0) + 1;
        context.embeds.set(path, embed);
        const alt =
          typeof node.properties.alt === "string" ? node.properties.alt : "";
        parent.children[index] = diagramFigure(
          alt,
          prepareSvg(svgText, `${baseId}-${String(embed)}`),
        );
        return;
      }
      node.properties.src = path;
      context.assets.set(path, path);
    });
  };

/**
 * Builds the renderer for one bundle: one Shiki highlighter with the languages the content uses, created
 * once because it is by far the most expensive step. Rendering itself is synchronous and deterministic.
 */
export const createMarkdownRenderer = async (
  files: ReadonlyMap<string, string>,
  langs: readonly string[],
): Promise<MarkdownRenderer> => {
  const highlighter = await createHighlighter({
    themes: Object.values(THEMES),
    langs: [...langs],
  });
  const diagramIds = new Map<string, string>();
  for (const path of [...files.keys()]
    .filter((key) => key.endsWith(".svg"))
    .sort()) {
    // The id derives from the path, so adding a diagram elsewhere does not rename this one's ids.
    diagramIds.set(path, `dg-${(await sha256Hex(path)).slice(0, 8)}`);
  }
  const context: DiagramContext = {
    files,
    diagramIds,
    embeds: new Map(),
    assets: new Map(),
  };
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, { strict: false })
    .use(rehypeShiki(highlighter))
    .use(rehypeContentLinks(context))
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .freeze();
  return {
    render: (markdown, fromFile) =>
      String(
        processor.processSync({
          value: clozeToSpans(markdown),
          path: fromFile,
        }),
      ),
    assets: () =>
      Object.fromEntries(
        [...context.assets].sort(([a], [b]) => a.localeCompare(b, "en")),
      ),
  };
};
