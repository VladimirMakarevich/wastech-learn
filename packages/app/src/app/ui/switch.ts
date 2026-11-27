import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from "@angular/core";

/** An iOS switch on a native checkbox with `role="switch"`: the browser keeps focus, Space and the label. */
@Component({
  selector: "wl-switch",
  template: `<label class="g-row">
    <span class="g-label">{{ label() }}</span>
    <input
      type="checkbox"
      role="switch"
      class="switch"
      [checked]="checked()"
      (change)="checked.set($any($event.target).checked)"
    />
  </label>`,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Switch {
  readonly label = input.required<string>();
  readonly checked = model(false);
}
