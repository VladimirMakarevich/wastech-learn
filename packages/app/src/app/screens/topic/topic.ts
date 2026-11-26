import { ChangeDetectionStrategy, Component } from "@angular/core";

/** The screen's route; it fills in as the milestone's phases land. */
@Component({
  selector: "wl-topic",
  template: `<main class="screen" data-screen="topic"></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topic {}
