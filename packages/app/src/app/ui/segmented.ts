import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from "@angular/core";

export interface Segment<Value extends string | number> {
  readonly value: Value;
  readonly label: string;
  /** The key that picks it, shown as a keycap: confidence 1–3 in review. */
  readonly key?: string;
}

/**
 * A segmented control drawn after iOS: a group of toggle buttons, one pressed. Each is a real button with
 * `aria-pressed`, so a screen reader names the choice and Tab reaches every segment.
 */
@Component({
  selector: "wl-segmented",
  template: `<div class="segmented" role="group" [attr.aria-label]="label()">
    @for (segment of segments(); track segment.value) {
      <button
        type="button"
        [class.active]="segment.value === value()"
        [attr.aria-pressed]="segment.value === value()"
        [attr.aria-keyshortcuts]="segment.key ?? null"
        (click)="pick(segment.value)"
      >
        @if (segment.key !== undefined) {
          <kbd>{{ segment.key }}</kbd>
        }
        {{ segment.label }}
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
export class Segmented<Value extends string | number> {
  readonly segments = input.required<readonly Segment<Value>[]>();
  readonly label = input.required<string>();
  /** `undefined` while nothing is picked, as confidence before an answer may stay. */
  readonly value = model<Value | undefined>(undefined);
  /** Pressing the pressed segment again clears the choice, for an optional answer like confidence. */
  readonly clearable = input(false);

  protected pick(value: Value): void {
    this.value.set(
      this.clearable() && this.value() === value ? undefined : value,
    );
  }
}
