import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from "@angular/core";
import { Icon } from "./icon";

/** Two buttons around a tabular value, as on iOS; the value stays inside `min` and `max`. */
@Component({
  selector: "wl-stepper",
  imports: [Icon],
  template: `<span class="stepper" role="group" [attr.aria-label]="label()">
    <button
      type="button"
      [attr.aria-label]="lessLabel()"
      [disabled]="value() <= min()"
      (click)="step(-1)"
    >
      <wl-icon name="minus" />
    </button>
    <output class="tnum">{{ value() }}</output>
    <button
      type="button"
      [attr.aria-label]="moreLabel()"
      [disabled]="value() >= max()"
      (click)="step(1)"
    >
      <wl-icon name="plus" />
    </button>
  </span>`,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stepper {
  readonly label = input.required<string>();
  readonly lessLabel = input.required<string>();
  readonly moreLabel = input.required<string>();
  readonly min = input(0);
  readonly max = input(Number.MAX_SAFE_INTEGER);
  readonly value = model(0);

  protected step(delta: number): void {
    this.value.set(
      Math.min(this.max(), Math.max(this.min(), this.value() + delta)),
    );
  }
}
