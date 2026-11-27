import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { memoryOpacity } from "./memory";

/** One review item as a solid point whose opacity is its retrievability; a new item is an outline. */
@Component({
  selector: "wl-memory-point",
  template: "",
  host: {
    class: "pt",
    "[class.sm]": "size() === 'small'",
    "[class.new]": "retrievability() === null",
    "[class.cur]": "current()",
    "[style.--r]": "opacity()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryPoint {
  readonly retrievability = input.required<number | null>();
  readonly size = input<"regular" | "small">("regular");
  readonly current = input(false);
  protected readonly opacity = computed(() =>
    memoryOpacity(this.retrievability()).toFixed(2),
  );
}
