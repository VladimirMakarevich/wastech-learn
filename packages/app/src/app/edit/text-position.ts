/** The 0-based line of `## <section>` in a text, to open a summary where the learner was reading. */
export const sectionLine = (text: string, section: string): number => {
  const index = text
    .split("\n")
    .findIndex((line) => line.trim() === `## ${section}`);
  return Math.max(index, 0);
};

/** Character offset of the start of a 1-based line, clamped to the text. */
export const lineOffset = (text: string, line: number): number => {
  let offset = 0;
  for (let current = 1; current < line; current++) {
    const next = text.indexOf("\n", offset);
    if (next === -1) return text.length;
    offset = next + 1;
  }
  return offset;
};
