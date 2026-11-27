import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

// Line icons drawn for the prototype on a 24px grid; one stroke weight, so they sit with system type.
const PATHS = {
  home: ["M3 11 12 4l9 7", "M5 10v10h14V10"],
  review: ["M4 5h16v14H4z", "M8 10h8M8 14h5"],
  cards: ["M3 7h14v12H3z", "M7 4h12a2 2 0 0 1 2 2v10"],
  stats: ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  settings: [
    "M4 7h10M18 7h2M4 17h4M12 17h8",
    "M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    "M12 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  ],
  sun: [
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8",
    "M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  ],
  moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"],
  speaker: [
    "M4 9.5h3.5L12 5.5v13l-4.5-4H4z",
    "M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  ],
  pencil: ["M4 20h4L19 9l-4-4L4 16z", "m13.5 6.5 4 4"],
  chevron: ["m9 6 6 6-6 6"],
  search: ["M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14", "m20 20-3.5-3.5"],
  plus: ["M12 5v14M5 12h14"],
  minus: ["M5 12h14"],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 4v7h-7"],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof PATHS;

/** A decorative icon: always next to a text or an aria-label, never the only name of a control. */
@Component({
  selector: "wl-icon",
  template: `<svg
    class="ico"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    @for (d of paths(); track $index) {
      <path [attr.d]="d" />
    }
  </svg>`,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly paths = computed(() => PATHS[this.name()]);
}
