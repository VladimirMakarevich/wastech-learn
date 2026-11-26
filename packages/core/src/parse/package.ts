import { toString } from "mdast-util-to-string";
import { compareFindings, type Finding } from "../finding.js";
import { KEBAB_PATTERN, firstIssue } from "../schema/common.js";
import {
  BLOOM_LEVELS,
  CARD_TYPES,
  type BloomLevel,
  type CardType,
} from "../schema/front-matter.js";
import type { MaterialItem } from "../schema/mcp/content.js";
import {
  REQUIRED_PACKAGE_SECTIONS,
  learningPackageFrontMatterSchema,
  type LearningPackageFrontMatter,
} from "../schema/package.js";
import {
  MATERIAL_KINDS,
  MATERIAL_STATUSES,
  SUMMARY_SECTION_NAMES,
  type SummarySectionName,
} from "../template.js";
import { LINK_PATTERN, linkParts, tableCells } from "../serialize/inline.js";
import type { SummarySections } from "../serialize/summary.js";
import { splitFrontMatter } from "./front-matter.js";
import { parseMarkdown } from "./markdown.js";
import { findSection, readSections, type Section } from "./sections.js";

/** A card a chat proposed: not yet a file, and not a card until the learner picks it. */
export interface CandidateCard {
  /** 1-based position in the package, how findings and the learner refer to it. */
  readonly index: number;
  readonly type: CardType;
  readonly bloom: BloomLevel;
  readonly idea: string | undefined;
  readonly question: string;
  readonly answer: string;
  readonly rubric: readonly string[];
  readonly explanation: string | undefined;
}

export interface LearningPackage {
  readonly frontMatter: LearningPackageFrontMatter;
  readonly title: string;
  readonly keyIdea: string;
  readonly summary: SummarySections;
  readonly materials: readonly MaterialItem[];
  /** Mermaid sources; their alt text is written when the learner saves them. */
  readonly diagrams: readonly string[];
  readonly cards: readonly CandidateCard[];
}

export interface PackageParse {
  /** `undefined` when the front matter is unusable: without it the package cannot be placed anywhere. */
  readonly package: LearningPackage | undefined;
  readonly findings: readonly Finding[];
}

interface Block {
  readonly name: string;
  readonly markdown: string;
  /** Line of the heading within the section's Markdown, 1-based. */
  readonly line: number;
}

/** `###` blocks of a section, split by the Markdown tree so a `###` line in a code block stays code. */
const subsections = (markdown: string): readonly Block[] => {
  const headings = parseMarkdown(markdown).children.flatMap((node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (
      node.type !== "heading" ||
      node.depth !== 3 ||
      start === undefined ||
      end === undefined
    ) {
      return [];
    }
    return [
      {
        name: toString(node).trim(),
        start,
        end,
        line: node.position?.start.line ?? 1,
      },
    ];
  });
  return headings.map((heading, index) => ({
    name: heading.name,
    line: heading.line,
    markdown: markdown
      .slice(heading.end, headings[index + 1]?.start ?? markdown.length)
      .trim(),
  }));
};

// A chat asked for "one markdown code block" often keeps the fence when the answer is copied whole.
const OUTER_FENCE = /^\s*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\1\s*$/;

const unwrap = (text: string): string => OUTER_FENCE.exec(text)?.[2] ?? text;

const isSummarySection = (name: string): name is SummarySectionName =>
  (SUMMARY_SECTION_NAMES as readonly string[]).includes(name);

const KEY_IDEA = /^key idea\s*:\s*/i;

const keyIdeaOf = (topic: Section | undefined): string => {
  const text = topic?.markdown.trim() ?? "";
  const line = text
    .split("\n")
    .find((candidate) => KEY_IDEA.test(candidate.trim()));
  return line === undefined ? text : line.trim().replace(KEY_IDEA, "").trim();
};

const FIELD = /^([QARE]):\s?(.*)$/;

const fieldKey = (marker: string): "Q" | "A" | "R" | "E" | undefined =>
  marker === "Q" || marker === "A" || marker === "R" || marker === "E"
    ? marker
    : undefined;

interface CardFields {
  readonly Q: string[];
  readonly A: string[];
  readonly R: string[];
  readonly E: string[];
}

/**
 * Reads the `Q:`, `A:`, `R:` and `E:` lines of one candidate. A line without a marker continues the field
 * above it; every `R:` line, and every `- ` line under one, is a separate rubric point.
 */
const readFields = (markdown: string): CardFields => {
  const fields: CardFields = { Q: [], A: [], R: [], E: [] };
  let current: keyof CardFields | undefined;
  for (const raw of markdown.split("\n")) {
    const match = FIELD.exec(raw.trim());
    if (match !== null) {
      current = fieldKey(match[1] ?? "");
      if (current !== undefined) fields[current].push(match[2] ?? "");
      continue;
    }
    if (current === undefined) continue;
    if (current === "R") {
      // Rubric points are single lines; a blank line between them separates nothing.
      if (/^[-*]\s+/.test(raw.trim())) {
        fields.R.push(raw.trim().replace(/^[-*]\s+/, ""));
      } else if (raw.trim() !== "") {
        fields.R[fields.R.length - 1] =
          `${fields.R.at(-1) ?? ""} ${raw.trim()}`;
      }
      continue;
    }
    // A blank line stays: it separates paragraphs of an answer and lines of a code block.
    const values = fields[current];
    values[values.length - 1] = `${values.at(-1) ?? ""}\n${raw}`;
  }
  return fields;
};

const joined = (values: readonly string[]): string => values.join("\n").trim();

const isCardType = (value: string): value is CardType =>
  (CARD_TYPES as readonly string[]).includes(value);

const isBloom = (value: string): value is BloomLevel =>
  (BLOOM_LEVELS as readonly string[]).includes(value);

interface CardHeading {
  readonly type: string;
  readonly bloom: string;
  readonly idea: string | undefined;
}

const cardHeading = (name: string): CardHeading => {
  const [type = "", bloom = "", idea = ""] = name
    .split(/\s*[·|]\s*/)
    .map((part) => part.trim());
  return { type, bloom, idea: idea === "" ? undefined : idea };
};

/** The first field of a candidate that cannot become a card, or `undefined` when it can. */
const invalidField = (
  heading: CardHeading,
  fields: CardFields,
): string | undefined => {
  if (!isCardType(heading.type)) return "type";
  if (!isBloom(heading.bloom)) return "bloom";
  if (heading.idea !== undefined && !KEBAB_PATTERN.test(heading.idea))
    return "idea";
  if (joined(fields.Q) === "") return "Q";
  if (joined(fields.A) === "") return "A";
  return undefined;
};

const readCards = (
  file: string,
  section: Section,
  findings: Finding[],
): CandidateCard[] => {
  const cards: CandidateCard[] = [];
  subsections(section.markdown).forEach((block, position) => {
    const index = position + 1;
    const heading = cardHeading(block.name);
    const fields = readFields(block.markdown);
    const field = invalidField(heading, fields);
    if (
      field !== undefined ||
      !isCardType(heading.type) ||
      !isBloom(heading.bloom)
    ) {
      findings.push({
        ruleId: "package-card",
        severity: "error",
        file,
        line: section.contentLine + block.line - 1,
        params: { card: index, field: field ?? "type" },
      });
      return;
    }
    const explanation = joined(fields.E);
    cards.push({
      index,
      type: heading.type,
      bloom: heading.bloom,
      idea: heading.idea,
      question: joined(fields.Q),
      answer: joined(fields.A),
      rubric: fields.R.map((point) => point.trim()).filter(
        (point) => point !== "",
      ),
      explanation: explanation === "" ? undefined : explanation,
    });
  });
  return cards;
};

const readMaterialRows = (
  file: string,
  section: Section,
  findings: Finding[],
): MaterialItem[] => {
  const items: MaterialItem[] = [];
  section.markdown.split("\n").forEach((raw, offset) => {
    if (!raw.trim().startsWith("|")) return;
    const [title = "", kind = "", why = "", status = "to-read"] =
      tableCells(raw);
    // The header and its `---` separator are the table's frame, not materials.
    if (/^title$/i.test(title) || /^:?-+:?$/.test(title)) return;
    const line = section.contentLine + offset;
    const link = LINK_PATTERN.exec(title);
    const knownKind = MATERIAL_KINDS.find(
      (candidate) => candidate === kind.toLowerCase(),
    );
    const knownStatus = MATERIAL_STATUSES.find(
      (candidate) => candidate === status.toLowerCase(),
    );
    if (
      link === null ||
      knownKind === undefined ||
      knownStatus === undefined ||
      why === ""
    ) {
      const field =
        link === null
          ? "Title"
          : knownKind === undefined
            ? "Kind"
            : knownStatus === undefined
              ? "Status"
              : "Why";
      findings.push({
        ruleId: "package-material",
        severity: "error",
        file,
        line,
        params: { field },
      });
      return;
    }
    items.push({
      title: linkParts(link).text,
      url: linkParts(link).url,
      kind: knownKind,
      why,
      status: knownStatus,
    });
  });
  return items;
};

const mermaidSources = (section: Section | undefined): string[] =>
  section === undefined
    ? []
    : parseMarkdown(section.markdown).children.flatMap((node) =>
        node.type === "code" && node.lang === "mermaid" ? [node.value] : [],
      );

/**
 * Parses a learning package exported from a chat without MCP. Every problem comes back as a finding with
 * the field or card it is about, so the learner or the chat can fix the file; candidates and materials
 * that parsed cleanly are returned even when others did not, because one malformed card should not cost
 * the rest of the conversation.
 */
export const parseLearningPackage = (
  file: string,
  text: string,
): PackageParse => {
  const findings: Finding[] = [];
  const split = splitFrontMatter(unwrap(text));
  if (!split.ok) {
    findings.push(
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
          },
    );
    return { package: undefined, findings };
  }
  const parsed = learningPackageFrontMatterSchema.safeParse(split.data);
  if (!parsed.success) {
    findings.push({
      ruleId: "front-matter-schema",
      severity: "error",
      file,
      line: 1,
      params: { field: firstIssue(parsed.error).field },
    });
    return { package: undefined, findings };
  }
  const { title, sections } = readSections(split.body, split.bodyLine);
  for (const name of REQUIRED_PACKAGE_SECTIONS) {
    if (findSection(sections, name) === undefined) {
      findings.push({
        ruleId: "section-missing",
        severity: "error",
        file,
        params: { section: name },
      });
    }
  }
  const summary: SummarySections = {};
  const summarySection = findSection(sections, "Summary");
  for (const block of subsections(summarySection?.markdown ?? "")) {
    if (isSummarySection(block.name)) {
      summary[block.name] = block.markdown;
    } else {
      findings.push({
        ruleId: "package-summary-section",
        severity: "warning",
        file,
        line: (summarySection?.contentLine ?? 1) + block.line - 1,
        params: { section: block.name },
      });
    }
  }
  const materialsSection = findSection(sections, "Materials");
  const cardsSection = findSection(sections, "Cards");
  const learningPackage: LearningPackage = {
    frontMatter: parsed.data,
    title: title ?? parsed.data.topic,
    keyIdea: keyIdeaOf(findSection(sections, "Topic")),
    summary,
    materials:
      materialsSection === undefined
        ? []
        : readMaterialRows(file, materialsSection, findings),
    diagrams: mermaidSources(findSection(sections, "Diagrams")),
    cards:
      cardsSection === undefined ? [] : readCards(file, cardsSection, findings),
  };
  return { package: learningPackage, findings: findings.sort(compareFindings) };
};
