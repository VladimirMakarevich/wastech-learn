/** What the keyboard handler needs from a key event, so the rules are tested without a browser. */
export interface KeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  /** The event came from a text field, where letters are typing, not commands. */
  readonly editable: boolean;
  /** The physical key, `KeyU` for the key that types `u` on a Latin layout. */
  readonly code?: string;
}

const PHYSICAL_LETTER = /^Key([A-Z])$/;

/**
 * A letter typed in another script (`г` on a Russian layout) stands for the Latin letter of the same key: the
 * shortcuts belong to the keys, and a learner who writes Russian must not switch layouts to undo a rating.
 * Latin letters with diacritics (`ą`, `é`) keep their own name, so typing them triggers nothing.
 */
const letterOf = (input: KeyInput): string => {
  const typed = input.key.toLowerCase();
  if (!/\p{L}/u.test(typed) || /\p{Script=Latin}/u.test(typed)) return typed;
  const physical = PHYSICAL_LETTER.exec(input.code ?? "")?.[1];
  return physical === undefined ? typed : physical.toLowerCase();
};

/**
 * A key as the screens name it: `Space`, `Escape`, `1`, `u`, `!`, `Ctrl+z`. Cmd on a Mac counts as Ctrl,
 * so undo is the same chord everywhere; letters are lower case, so Caps Lock changes nothing, and named by
 * their key, so the keyboard layout changes nothing either.
 */
export const keyName = (input: KeyInput): string => {
  const base =
    input.key === " "
      ? "Space"
      : input.key.length === 1
        ? letterOf(input)
        : input.key;
  return input.ctrlKey || input.metaKey ? `Ctrl+${base}` : base;
};

export type GlobalCommand = "search" | "go-home";

/** Waiting for the second key of `g h`, and since when. */
export interface SequenceState {
  readonly gAt: number | null;
}

// Long enough to type the second key deliberately, short enough that a stray `g` does not linger.
export const SEQUENCE_MS = 1_200;

export const IDLE: SequenceState = { gAt: null };

/**
 * The keys that work on every screen: `/` focuses the search field, `g` then `h` goes home. Nothing fires
 * while the learner types in a field or holds Alt, which belongs to the browser and the OS.
 */
export const readGlobalKey = (
  input: KeyInput,
  state: SequenceState,
  at: number,
): {
  readonly command: GlobalCommand | undefined;
  readonly state: SequenceState;
} => {
  if (input.editable || input.altKey || input.ctrlKey || input.metaKey)
    return { command: undefined, state: IDLE };
  const name = keyName(input);
  if (state.gAt !== null && at - state.gAt <= SEQUENCE_MS && name === "h")
    return { command: "go-home", state: IDLE };
  if (name === "g") return { command: undefined, state: { gAt: at } };
  if (name === "/") return { command: "search", state: IDLE };
  return { command: undefined, state: IDLE };
};

/** A field, an editable element or a select, where keys belong to the control. */
export const isEditable = (target: EventTarget | null): boolean => {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement))
    return false;
  if (target.isContentEditable) return true;
  if (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
    return true;
  if (target instanceof HTMLInputElement)
    return !["checkbox", "radio", "button", "submit", "range"].includes(
      target.type,
    );
  return false;
};

/**
 * Enter on a button or link presses it; a screen's Enter on top would start a session when the learner
 * meant the button they tabbed to. Space stays with the screen: on Review it reveals and rates even
 * after a mouse click left a confidence button focused.
 */
export const isControlActivation = (
  key: string,
  target: EventTarget | null,
): boolean => {
  if (key !== "Enter") return false;
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement))
    return false;
  return (
    target instanceof HTMLButtonElement ||
    (target instanceof HTMLAnchorElement && target.href !== "") ||
    target.getAttribute("role") === "button"
  );
};

/**
 * A modal dialog is open: the screen beneath is inert, and its keys must not rate or archive a card
 * meanwhile. Asked of the page, not of the key's target: a button that turns disabled while git runs
 * drops focus to the body, and the next key must still stay out of the screen.
 */
export const isDialogOpen = (document: Document): boolean =>
  document.querySelector(".cdk-dialog-container") !== null;
