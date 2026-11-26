import { ChangeDetectionStrategy, Component } from "@angular/core";

/** The screen's route; it fills in as the milestone's phases land. */
@Component({
  selector: "wl-home",
  template: `<main class="screen" data-screen="home"></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
