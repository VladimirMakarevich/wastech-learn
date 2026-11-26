import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";
import { countWords, emphasisTexts } from "../markdown-metrics.js";

// An example is a sentence, not a stressed word: at least two words in italics.
const EXAMPLE_MIN_WORDS = 2;

/**
 * A word without its language pair cannot be read aloud or flipped, and a word without an example
 * sentence is learned without the context that makes it usable.
 */
export const checkVocab = (card: Card): readonly Finding[] => {
  if (card.frontMatter.type !== "vocab") return [];
  const findings: Finding[] = [];
  if (card.frontMatter.langPair === undefined) {
    findings.push({
      ruleId: "vocab-lang-pair",
      severity: "error",
      file: card.file,
      line: 1,
      params: {},
    });
  }
  const hasExample = emphasisTexts(card.answer.markdown).some(
    (text) => countWords(text) >= EXAMPLE_MIN_WORDS,
  );
  if (!hasExample) {
    findings.push({
      ruleId: "vocab-example",
      severity: "error",
      file: card.file,
      line: card.answer.line,
      params: {},
    });
  }
  return findings;
};
