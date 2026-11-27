import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * An iOS inset-grouped list: a muted header, an opaque body with hairline-divided rows, an optional
 * footer. The library screens and the inspector are built from these.
 */
@Component({
  selector: "wl-group",
  template: `<section>
    @if (header() !== undefined) {
      <h2 class="group-h">{{ header() }}</h2>
    }
    <div class="group-body"><ng-content /></div>
    @if (footer() !== undefined) {
      <p class="group-f">{{ footer() }}</p>
    }
  </section>`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Group {
  readonly header = input<string | undefined>(undefined);
  readonly footer = input<string | undefined>(undefined);
}
