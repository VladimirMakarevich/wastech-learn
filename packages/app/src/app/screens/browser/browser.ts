import { ChangeDetectionStrategy, Component } from "@angular/core";

/** The screen's route; it fills in as the milestone's phases land. */
@Component({
  selector: "wl-browser",
  template: `<main class="screen" data-screen="browser"></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Browser {}
