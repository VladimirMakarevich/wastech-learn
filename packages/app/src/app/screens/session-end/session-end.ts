import { ChangeDetectionStrategy, Component } from "@angular/core";

/** The screen's route; it fills in as the milestone's phases land. */
@Component({
  selector: "wl-session-end",
  template: `<main class="screen" data-screen="session-end"></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionEnd {}
