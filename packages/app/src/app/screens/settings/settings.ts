import { ChangeDetectionStrategy, Component } from "@angular/core";

/** The screen's route; it fills in as the milestone's phases land. */
@Component({
  selector: "wl-settings",
  template: `<main class="screen" data-screen="settings"></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {}
