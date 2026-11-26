import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { CODE_LINES_LIMIT, CODE_WIDTH_LIMIT } from "../limits.js";
import { codeBlocks } from "../markdown-metrics.js";

// Width as the reader sees it: a Cyrillic letter or an emoji is one column, whatever its UTF-16 length.
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/** Code on a card has to fit on a screen and in working memory, or the card tests reading, not recall. */
export const checkCodeSize = (card: Card): readonly Finding[] => {
  const findings: Finding[] = [];
  for (const section of card.sections) {
    for (const { code, line } of codeBlocks(section)) {
      const lines = code.value.split("\n");
      if (lines.length > CODE_LINES_LIMIT) {
        findings.push({
          ruleId: "code-lines",
          severity: "error",
          file: card.file,
          line,
          params: { count: lines.length, limit: CODE_LINES_LIMIT },
        });
      }
      lines.forEach((text, index) => {
        const width = Array.from(graphemes.segment(text)).length;
        if (width <= CODE_WIDTH_LIMIT) return;
        findings.push({
          ruleId: "code-width",
          severity: "error",
          file: card.file,
          line: line + 1 + index,
          params: { count: width, limit: CODE_WIDTH_LIMIT },
        });
      });
    }
  }
  return findings;
};
