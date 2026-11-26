import { ChangeDetectionStrategy, Component } from "@angular/core";

/** The screen's route; it fills in as the milestone's phases land. */
@Component({
  selector: "wl-review",
  template: `<main class="screen" data-screen="review"></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Review {}
