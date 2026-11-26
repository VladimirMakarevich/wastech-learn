const CLOZE = /\{\{c(\d+)::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g;

/**
 * Turns `{{c1::answer}}` into a marked span before the Markdown is parsed: the app hides the span of the
 * variant being asked and shows the rest, from the same HTML for every variant. It has to happen on the
 * source text, because an answer with code or emphasis (`{{c1::`rwnd`}}`) is split across several
 * Markdown nodes and would otherwise reach the page with its answer visible. The span is raw HTML, so
 * the answer inside it is still parsed as Markdown, and the sanitizer keeps only its class and number.
 */
export const clozeToSpans = (markdown: string): string =>
  markdown.replace(
    CLOZE,
    (_match, number: string, answer: string) =>
      `<span class="cloze" data-cloze="${number}">${answer}</span>`,
  );
