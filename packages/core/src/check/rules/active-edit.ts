import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { findSection, readSections } from "../../parse/sections.js";
import { splitFrontMatter } from "../../parse/front-matter.js";
import { ACTIVE_EDIT_THRESHOLD } from "../limits.js";
import { wordsOf } from "../markdown-metrics.js";

const longestCommonSubsequence = (
  a: readonly string[],
  b: readonly string[],
): number => {
  let previous = new Array<number>(b.length + 1).fill(0);
  for (const word of a) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      current[j] =
        word === b[j - 1]
          ? (previous[j - 1] ?? 0) + 1
          : Math.max(previous[j] ?? 0, current[j - 1] ?? 0);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
};

/** Share of words that differ between two versions of a text, from 0 (same words) to 1 (nothing kept). */
export const changedWordShare = (before: string, after: string): number => {
  const a = wordsOf(before);
  const b = wordsOf(after);
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  return 1 - longestCommonSubsequence(a, b) / longest;
};

const baselineSections = (text: string) => {
  const split = splitFrontMatter(text);
  if (!split.ok) return undefined;
  const { data } = split;
  const status: unknown =
    typeof data === "object" && data !== null && "status" in data
      ? data.status
      : undefined;
  return {
    status,
    sections: readSections(split.body, split.bodyLine).sections,
  };
};

/**
 * Keeping a card's id keeps its review history, which is right for a typo and wrong for a new meaning:
 * the history then describes a different card. A large rewrite of an active card is flagged so the author
 * decides between keeping the id and retiring the card for a new one. It is a warning, never a block.
 *
 * `baseline` holds the previous text of the same files, for example the last committed version.
 */
export const checkActiveEdit = (
  cards: readonly Card[],
  baseline: ReadonlyMap<string, string>,
): readonly Finding[] => {
  const findings: Finding[] = [];
  for (const card of cards) {
    if (card.frontMatter.status !== "active") continue;
    const previousText = baseline.get(card.file);
    if (previousText === undefined) continue;
    const previous = baselineSections(previousText);
    if (previous?.status !== "active") continue;
    for (const section of [card.question, card.answer]) {
      const before = findSection(previous.sections, section.name);
      if (before === undefined) continue;
      const share = changedWordShare(before.markdown, section.markdown);
      if (share <= ACTIVE_EDIT_THRESHOLD) continue;
      findings.push({
        ruleId: "active-edit",
        severity: "warning",
        file: card.file,
        line: section.line,
        params: { section: section.name, percent: Math.round(share * 100) },
      });
    }
  }
  return findings;
};
