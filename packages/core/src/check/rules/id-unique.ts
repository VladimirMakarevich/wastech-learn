import type { Finding } from "../../finding.js";
import type { Card } from "../../model.js";

/**
 * The review log refers to cards by id alone, so two files sharing an id would share one history. mdlint
 * sees one file at a time and cannot catch this. Every duplicate points at the first other file with
 * the same id, which keeps the output stable whatever order the files were read in.
 */
export const checkIdUnique = (cards: readonly Card[]): readonly Finding[] => {
  const byId = new Map<string, string[]>();
  for (const card of cards) {
    const files = byId.get(card.id) ?? [];
    files.push(card.file);
    byId.set(card.id, files);
  }
  const findings: Finding[] = [];
  for (const [id, files] of byId) {
    if (files.length < 2) continue;
    const sorted = [...files].sort();
    for (const file of sorted) {
      const other = sorted.find((candidate) => candidate !== file) ?? file;
      findings.push({
        ruleId: "id-unique",
        severity: "error",
        file,
        line: 1,
        params: { id, other },
      });
    }
  }
  return findings;
};
