// Web Crypto rather than node:crypto: the same hash has to come out in the browser, where the app checks
// whether a card changed since its last review, and on Node, where `check` and `render` run.
const encoder = new TextEncoder();

/** Lower-case hex SHA-256 of the UTF-8 bytes of `text`. */
export const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

const normalizeSection = (markdown: string): string =>
  markdown.replaceAll("\r\n", "\n").trim();

/**
 * Hash of what the learner is asked and what counts as the answer. Explanation, sources and the title
 * stay out: editing them must not mark the card as changed since its last review. Line endings and
 * surrounding blank lines are normalized, so a checkout on Windows hashes the same.
 */
export const contentHash = async (
  question: string,
  answer: string,
): Promise<string> =>
  `sha256:${await sha256Hex(JSON.stringify([normalizeSection(question), normalizeSection(answer)]))}`;
