import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AppData } from "../../data/app-data";
import { GitStatus } from "../../data/git-state";
import { I18n } from "../../i18n/i18n";
import { TPipe } from "../../i18n/t.pipe";
import { Keyboard } from "../../keys/keyboard";
import { Preferences } from "../../prefs/preferences";
import { ReviewSession } from "../../session/review-session";
import { SyncPanels } from "../../shell/sync-panels";
import { Icon } from "../../ui/icon";

/**
 * The calm end of a session: how much and how long, how recall went in the review phase, the cards
 * forgotten while sure, and what tomorrow holds. No streak, no score.
 */
@Component({
  selector: "wl-session-end",
  imports: [RouterLink, TPipe, Icon],
  templateUrl: "./session-end.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionEnd {
  protected readonly session = inject(ReviewSession);
  private readonly data = inject(AppData);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18n);
  protected readonly preferences = inject(Preferences);
  protected readonly summary = this.session.summary;
  // Ratings are only on this computer until they are committed and pushed; the summary says so once,
  // calmly, and sends nothing by itself.
  protected readonly git = inject(GitStatus);
  protected readonly syncPanels = inject(SyncPanels);

  protected readonly misses = computed(() => {
    const cards = new Map(
      (this.data.bundle()?.cards ?? []).map((card) => [card.id, card]),
    );
    return (this.summary()?.confidentMisses ?? []).map((item) => {
      const card = cards.get(item.slice(0, item.indexOf(":")));
      return { item, title: card?.title ?? item, lang: card?.lang ?? "en" };
    });
  });

  protected readonly missedItems = computed(() =>
    this.misses()
      .map((miss) => miss.item)
      .join(","),
  );

  protected readonly count = (cards: number): string =>
    this.i18n.t("count.cards", { count: cards });
  protected readonly minutes = (count: number): string =>
    this.i18n.t("count.minutes", { count });

  /** "за 1 минуту", "w 1 minutę": after the preposition the title needs the accusative. */
  protected readonly minutesIn = (count: number): string =>
    this.i18n.t("count.minutes-in", { count });

  constructor() {
    const release = inject(Keyboard).register((name) =>
      name === "u" || name === "Ctrl+z" ? this.undo() : false,
    );
    inject(DestroyRef).onDestroy(release);
  }

  /** The last card's rating ended the session; taking it back reopens the session on that card. */
  protected undo(): boolean {
    if (!this.session.undoEnded()) return false;
    void this.router.navigateByUrl("/review");
    return true;
  }
}
