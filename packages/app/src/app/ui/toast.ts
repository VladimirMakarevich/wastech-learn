import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  signal,
} from "@angular/core";

/** How long a message stays: long enough to read a sentence, short enough not to cover the next card. */
const TOAST_MS = 2_800;
/** A message with an action stays longer: the learner has to notice it, decide and reach the button. */
const ACTION_TOAST_MS = 8_000;

/** A button in the message that undoes what it reports, such as returning an archived card. */
export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

interface Shown {
  readonly text: string;
  readonly action: ToastAction | undefined;
}

/** One calm message at a time, announced politely to screen readers. */
@Injectable({ providedIn: "root" })
export class Toasts {
  readonly shown = signal<Shown | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string, action?: ToastAction): void {
    this.shown.set({ text: message, action });
    this.schedule(action === undefined ? TOAST_MS : ACTION_TOAST_MS);
  }

  /** A message the learner is pointing at or has tabbed into stays until they leave it. */
  hold(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  release(): void {
    if (this.shown() !== null) this.schedule(TOAST_MS);
  }

  private schedule(ms: number): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.shown.set(null);
    }, ms);
  }

  // Taken away before it runs, so a second click on a fading message cannot return a card twice.
  act(): void {
    const action = this.shown()?.action;
    this.shown.set(null);
    action?.run();
  }
}

@Component({
  selector: "wl-toast",
  template: `<div
    class="toast"
    role="status"
    [hidden]="toasts.shown() === null"
    (mouseenter)="toasts.hold()"
    (mouseleave)="toasts.release()"
    (focusin)="toasts.hold()"
    (focusout)="toasts.release()"
  >
    {{ toasts.shown()?.text }}
    @if (toasts.shown()?.action; as action) {
      <button
        class="btn sm toast-action"
        type="button"
        data-toast-action
        (click)="toasts.act()"
      >
        {{ action.label }}
      </button>
    }
  </div>`,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  protected readonly toasts = inject(Toasts);
}
