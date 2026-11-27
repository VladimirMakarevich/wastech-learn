import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  signal,
  inject,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { Library } from "../../data/library";
import { percent } from "../../format/duration";
import { I18n } from "../../i18n/i18n";
import { TPipe } from "../../i18n/t.pipe";
import { Keyboard } from "../../keys/keyboard";
import { Preferences } from "../../prefs/preferences";
import { Icon } from "../../ui/icon";
import { MemoryPoint } from "../../ui/memory-point";
import { homeModel, type TopicRow } from "./home-model";

/**
 * Home, after the prototype: how much today holds and three ways in, the week ahead, then the topics by
 * domain. After a long pause the count gives way to a calm plan; no number ever turns red.
 */
@Component({
  selector: "wl-home",
  imports: [RouterLink, TPipe, Icon, MemoryPoint],
  templateUrl: "./home.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly library = inject(Library);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18n);
  protected readonly preferences = inject(Preferences);

  /** Archived topics stay folded away until asked for: Home is about what to study now. */
  protected readonly showArchived = signal(false);

  protected readonly model = computed(() => {
    const snapshot = this.library.snapshot();
    return snapshot === undefined ? undefined : homeModel(snapshot);
  });

  /** The short session in the learner's length, then a longer one that is not the same. */
  protected readonly lengths = computed(() => {
    const short = this.preferences.sessionMinutes();
    return [short, short === 15 ? 10 : 15] as const;
  });

  protected readonly count = (cards: number): string =>
    this.i18n.t("count.cards", { count: cards });
  protected readonly minutes = (count: number): string =>
    this.i18n.t("count.minutes", { count });

  /** A short session takes no new cards: with nothing else due, Enter starts the whole queue instead. */
  protected readonly onlyNew = computed(() => {
    const entries = this.model()?.queue.entries ?? [];
    return entries.length > 0 && entries.every((entry) => entry.kind === "new");
  });

  protected readonly newList = computed(() =>
    (this.model()?.newByDomain ?? [])
      .map((entry) => this.i18n.t("home.new-domain", entry))
      .join(" · "),
  );

  protected readonly forecast = computed(() => {
    const model = this.model();
    const timeZone = this.library.snapshot()?.context.config.timezone;
    if (model === undefined) return [];
    const max = Math.max(1, ...model.forecast.map((day) => day.due));
    return model.forecast.map((day, index) => ({
      key: day.day.key,
      due: day.due,
      today: index === 0,
      height: Math.round((day.due / max) * 100),
      name: this.i18n.date(
        day.day.start + 12 * 3_600_000,
        { weekday: "short" },
        timeZone,
      ),
    }));
  });

  constructor() {
    const release = inject(Keyboard).register((name) => {
      if (name !== "Enter") return false;
      this.start(this.onlyNew() ? "all" : this.lengths()[0]);
      return true;
    });
    inject(DestroyRef).onDestroy(release);
  }

  protected topicLabel(row: TopicRow): string {
    const cards = this.count(row.cards);
    const known = row.points.filter((point): point is number => point !== null);
    if (known.length === 0) return this.i18n.t("home.topic-new", { cards });
    const r = known.reduce((sum, value) => sum + value, 0) / known.length;
    return this.i18n.t("home.topic-memory", {
      cards,
      percent: percent(this.i18n.lang(), r),
    });
  }

  protected start(mode: number | "all"): void {
    void this.router.navigate(["/review"], {
      queryParams: { mode: String(mode) },
    });
  }
}
