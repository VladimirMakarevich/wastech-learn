import { ChangeDetectionStrategy, Component } from "@angular/core";

/** The screen's route; it fills in as the milestone's phases land. */
@Component({
  selector: "wl-stats",
  template: `<main class="screen" data-screen="stats"></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stats {}
