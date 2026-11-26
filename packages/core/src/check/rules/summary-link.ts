import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { findSection } from "../../parse/sections.js";
import { linkUrls } from "../markdown-metrics.js";

const SUMMARY_ANCHOR = /^\.\.\/summary\.md#.+/;

/** A card is a recall cue for a part of the summary; without the link the learner has nowhere to look it up. */
export const checkSummaryLink = (card: Card): readonly Finding[] => {
  const sources = findSection(card.sections, "Sources");
  if (
    sources !== undefined &&
    linkUrls(sources.markdown).some((url) => SUMMARY_ANCHOR.test(url))
  ) {
    return [];
  }
  return [
    {
      ruleId: "summary-link",
      severity: "error",
      file: card.file,
      line: sources?.line ?? 1,
      params: {},
    },
  ];
};
