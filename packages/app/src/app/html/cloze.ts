/** How the gaps of a cloze card are shown for the variant being asked. */
export interface ClozeView {
  /** The gap number asked (`c2` → 2); every other gap shows its answer as plain text. */
  readonly asked: number;
  readonly revealed: boolean;
}

/** `c3` → 3; a variant that is not a cloze variant asks no gap. */
export const askedGap = (variant: string): number | undefined => {
  const match = /^c(\d+)$/.exec(variant);
  return match === null ? undefined : Number(match[1]);
};

/**
 * Applies a cloze view to rendered card HTML in the DOM: the asked gap shows a placeholder until the answer
 * is revealed, then its text in the open style; the other gaps read as ordinary text. Working on the DOM
 * keeps the bundle's sanitized HTML untouched: nothing is parsed from strings here.
 */
export const applyCloze = (
  root: ParentNode,
  view: ClozeView,
  placeholder: string,
): void => {
  for (const gap of root.querySelectorAll<HTMLElement>(
    "span.cloze[data-cloze]",
  )) {
    const number = Number(gap.dataset.cloze);
    if (number !== view.asked) {
      gap.className = "cloze-filled";
      continue;
    }
    if (view.revealed) {
      gap.classList.add("open");
      continue;
    }
    gap.dataset.answer = "";
    gap.replaceChildren(placeholder);
  }
};
