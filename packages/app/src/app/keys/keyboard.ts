import { DOCUMENT, Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Clock } from "../data/clock";
import {
  IDLE,
  isEditable,
  keyName,
  readGlobalKey,
  type KeyInput,
  type SequenceState,
} from "./keys";

/** A screen's keys: returns `true` when it handled the key, so the browser's default is prevented. */
export type ScreenKeys = (name: string, input: KeyInput) => boolean;

/**
 * One keydown listener for the whole app. Global keys come first, then the keys of the screen on top; a
 * screen registers its handler when it opens and removes it when it closes.
 */
@Injectable({ providedIn: "root" })
export class Keyboard {
  private readonly router = inject(Router);
  private readonly clock = inject(Clock);
  private readonly handlers: ScreenKeys[] = [];
  private sequence: SequenceState = IDLE;
  private focusSearch: () => void = () => undefined;

  constructor() {
    inject(DOCUMENT).addEventListener("keydown", (event) => {
      this.handle(event);
    });
  }

  /** The shell's search field, focused by `/`. */
  setSearch(focus: () => void): void {
    this.focusSearch = focus;
  }

  register(handler: ScreenKeys): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.lastIndexOf(handler);
      if (index !== -1) this.handlers.splice(index, 1);
    };
  }

  private handle(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    const input: KeyInput = {
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      editable: isEditable(event.target),
      code: event.code,
    };
    const global = readGlobalKey(
      input,
      this.sequence,
      this.clock.now().getTime(),
    );
    this.sequence = global.state;
    if (global.command === "search") {
      event.preventDefault();
      this.focusSearch();
      return;
    }
    if (global.command === "go-home") {
      event.preventDefault();
      void this.router.navigateByUrl("/");
      return;
    }
    if (input.editable || input.altKey) return;
    const screen = this.handlers.at(-1);
    if (screen?.(keyName(input), input) === true) event.preventDefault();
  }
}
