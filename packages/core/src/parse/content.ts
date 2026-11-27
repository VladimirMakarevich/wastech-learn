import type { z } from "zod";
import { compareFindings, type Finding } from "../finding.js";
import { contentHash } from "../hash.js";
import type {
  Card,
  ContentModel,
  Diagram,
  ParsedContent,
  Topic,
  TopicDoc,
} from "../model.js";
import { firstIssue } from "../schema/common.js";
import {
  cardFrontMatterSchema,
  materialsFrontMatterSchema,
  summaryFrontMatterSchema,
  topicIndexFrontMatterSchema,
} from "../schema/front-matter.js";
import { frontMatterFieldLine, splitFrontMatter } from "./front-matter.js";
import { findSection, readSections } from "./sections.js";
import { variantsFor } from "./variants.js";

const TOPIC_FILE = /^content\/([^/]+)\/([^/]+)\/(index|summary|materials)\.md$/;
const CARD_FILE = /^content\/([^/]+)\/([^/]+)\/cards\/[^/]+\.md$/;
const DIAGRAM_SOURCE = /^content\/.+\/diagrams\/[^/]+\.mmd$/;

/** Repository files as `path → text`: the only way content reaches the pure core. */
export type ContentFiles = ReadonlyMap<string, string>;

type DocResult<FrontMatter> =
  | { readonly ok: true; readonly doc: TopicDoc<FrontMatter> }
  | { readonly ok: false; readonly finding: Finding };

const parseDoc = <FrontMatter>(
  file: string,
  text: string,
  schema: z.ZodType<FrontMatter>,
): DocResult<FrontMatter> => {
  const split = splitFrontMatter(text);
  if (!split.ok) {
    const finding: Finding =
      split.reason === "missing"
        ? {
            ruleId: "front-matter-missing",
            severity: "error",
            file,
            line: 1,
            params: {},
          }
        : {
            ruleId: "front-matter-yaml",
            severity: "error",
            file,
            line: split.line,
            params: {},
          };
    return { ok: false, finding };
  }
  const parsed = schema.safeParse(split.data);
  if (!parsed.success) {
    const { field } = firstIssue(parsed.error);
    return {
      ok: false,
      finding: {
        ruleId: "front-matter-schema",
        severity: "error",
        file,
        line: frontMatterFieldLine(text, field),
        params: { field },
      },
    };
  }
  const { title, sections } = readSections(split.body, split.bodyLine);
  return { ok: true, doc: { file, frontMatter: parsed.data, title, sections } };
};

const sortedPaths = (files: ContentFiles, pattern: RegExp): string[] =>
  [...files.keys()].filter((path) => pattern.test(path)).sort();

/**
 * Turns the content files into the typed model every later step works on: topics, cards with their
 * review items and content hash, diagrams. A file that fails its schema stays out of the model and comes
 * back as a finding naming the file and the field, so one broken card never hides the rest.
 */
export const parseContent = async (
  files: ContentFiles,
): Promise<ParsedContent> => {
  const findings: Finding[] = [];
  const topics = new Map<string, Topic>();

  for (const file of sortedPaths(files, TOPIC_FILE)) {
    const [, domain = "", slug = "", kind] = TOPIC_FILE.exec(file) ?? [];
    if (kind !== "index") continue;
    const dir = `content/${domain}/${slug}`;
    const index = parseDoc(
      file,
      files.get(file) ?? "",
      topicIndexFrontMatterSchema,
    );
    if (!index.ok) {
      findings.push(index.finding);
      continue;
    }
    const companion = <FrontMatter>(
      name: string,
      schema: z.ZodType<FrontMatter>,
    ) => {
      const path = `${dir}/${name}`;
      const text = files.get(path);
      if (text === undefined) {
        findings.push({
          ruleId: "topic-file-missing",
          severity: "error",
          file,
          params: { name },
        });
        return undefined;
      }
      const doc = parseDoc(path, text, schema);
      if (doc.ok) return doc.doc;
      findings.push(doc.finding);
      return undefined;
    };
    topics.set(`${domain}/${slug}`, {
      path: `${domain}/${slug}`,
      domain,
      dir,
      index: index.doc,
      summary: companion("summary.md", summaryFrontMatterSchema),
      materials: companion("materials.md", materialsFrontMatterSchema),
    });
  }

  const cards: Card[] = [];
  for (const file of sortedPaths(files, CARD_FILE)) {
    const [, domain = "", slug = ""] = CARD_FILE.exec(file) ?? [];
    const topic = topics.get(`${domain}/${slug}`);
    if (topic === undefined) {
      findings.push({
        ruleId: "topic-missing",
        severity: "error",
        file,
        params: { topic: `${domain}/${slug}` },
      });
      continue;
    }
    const doc = parseDoc(file, files.get(file) ?? "", cardFrontMatterSchema);
    if (!doc.ok) {
      findings.push(doc.finding);
      continue;
    }
    const { frontMatter, sections, title } = doc.doc;
    const question = findSection(sections, "Question");
    const answer = findSection(sections, "Answer");
    if (question === undefined || answer === undefined) {
      // Pointing at the heading the missing section would stand before lets an editor put the cursor
      // where the section belongs.
      const anchor =
        question === undefined
          ? sections[0]
          : (sections[sections.indexOf(question) + 1] ?? question);
      findings.push({
        ruleId: "section-missing",
        severity: "error",
        file,
        ...(anchor === undefined ? {} : { line: anchor.line }),
        params: { section: question === undefined ? "Question" : "Answer" },
      });
      continue;
    }
    const variants = variantsFor(frontMatter.type, question.markdown);
    cards.push({
      file,
      id: frontMatter.id,
      topic: topic.path,
      domain,
      frontMatter,
      lang: frontMatter.lang ?? topic.index.frontMatter.lang,
      title,
      sections,
      question,
      answer,
      variants,
      items: variants.map((variant) => `${frontMatter.id}:${variant}`),
      contentHash: await contentHash(question.markdown, answer.markdown),
    });
  }

  const diagrams: Diagram[] = sortedPaths(files, DIAGRAM_SOURCE).map(
    (source) => {
      const svg = source.replace(/\.mmd$/, ".svg");
      return {
        source,
        sourceText: files.get(source) ?? "",
        svg,
        svgText: files.get(svg),
      };
    },
  );

  const model: ContentModel = {
    topics: [...topics.values()],
    cards,
    diagrams,
  };
  return { model, findings: findings.sort(compareFindings) };
};
