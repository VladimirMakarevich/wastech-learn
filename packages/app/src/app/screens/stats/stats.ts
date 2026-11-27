import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import type { RetentionCount } from "@wastech-learn/srs";
import { Library } from "../../data/library";
import { percent } from "../../format/duration";
import { I18n } from "../../i18n/i18n";
import { TPipe } from "../../i18n/t.pipe";
import { statsModel } from "./stats-model";

const TICKS = [0, 7, 14, 21, 29] as const;

/**
 * Statistics, after the prototype: one labelled 30-day load chart, and true retention for young and
 * mature cards over a week and a month. Every figure comes from replaying the log.
 */
@Component({
  selector: "wl-stats",
  imports: [TPipe],
  templateUrl: "./stats.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stats {
  private readonly library = inject(Library);
  protected readonly i18n = inject(I18n);
  protected readonly ticks = TICKS;

  protected readonly model = computed(() => {
    const snapshot = this.library.snapshot();
    return snapshot === undefined ? undefined : statsModel(snapshot);
  });

  protected value(count: RetentionCount): string {
    if (count.rate === null) return this.i18n.t("stats.none");
    return this.i18n.t("stats.value", {
      percent: percent(this.i18n.lang(), count.rate),
      passed: count.passed,
      total: count.total,
    });
  }

  protected tick(day: number): string {
    return day === 0
      ? this.i18n.t("stats.today")
      : this.i18n.t("stats.in-days", {
          days: this.i18n.t("count.days", { count: day }),
        });
  }

  protected readonly cards = (count: number): string =>
    this.i18n.t("count.cards", { count });
}
