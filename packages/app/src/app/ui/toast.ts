import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  signal,
} from "@angular/core";

/** How long a message stays: long enough to read a sentence, short enough not to cover the next card. */
const TOAST_MS = 2_800;

/** One calm message at a time, announced politely to screen readers. */
@Injectable({ providedIn: "root" })
export class Toasts {
  readonly message = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string): void {
    this.message.set(message);
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.message.set(null);
    }, TOAST_MS);
  }
}

@Component({
  selector: "wl-toast",
  template: `<div
    class="toast"
    role="status"
    [hidden]="toasts.message() === null"
  >
    {{ toasts.message() }}
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
