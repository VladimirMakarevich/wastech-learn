import { CdkTrapFocus } from "@angular/cdk/a11y";
import { Dialog, DialogConfig, type DialogRef } from "@angular/cdk/dialog";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import type { GitEntry } from "@wastech-learn/core";
import { unsuspendEvent } from "@wastech-learn/session";
import { AppData } from "../../data/app-data";
import { CardActions } from "../../data/card-actions";
import { cardChanges, deletedCards } from "../../data/git-model";
import { GitStatus } from "../../data/git-state";
import { Clock } from "../../data/clock";
import { Library } from "../../data/library";
import { intervalLabel, percent } from "../../format/duration";
import { BundleHtml } from "../../html/bundle-html";
import type { MessageKey } from "../../i18n/en";
import { I18n } from "../../i18n/i18n";
import { TPipe } from "../../i18n/t.pipe";
import { Keyboard } from "../../keys/keyboard";
import { ReviewSession } from "../../session/review-session";
import { vscodeLink } from "../../shell/vscode";
import { Icon } from "../../ui/icon";
import { MemoryPoint } from "../../ui/memory-point";
import { Toasts } from "../../ui/toast";
import {
  NO_FILTERS,
  browserRows,
  filterRows,
  searchIndexOf,
  type BrowserFilters,
  type BrowserRow,
} from "./browser-model";
import {
  ConfirmDelete,
  type ConfirmDeleteData,
  type DeleteChoice,
} from "./confirm-delete";

const STATUSES = ["active", "suspended", "draft", "retired"] as const;
const STATUS_KEYS: Readonly<Record<string, MessageKey>> = {
  active: "status.active",
  suspended: "status.suspended",
  draft: "status.draft",
  retired: "status.retired",
};
const RATING_KEYS: Readonly<Record<number, MessageKey>> = {
  1: "rating.1",
  2: "rating.2",
  3: "rating.3",
  4: "rating.4",
};

/**
 * The card browser: search over the bundle's index and filters by domain, topic, tag, type, status, leech and
 * changed, a table with R, due, lapses and the last rating, and a side panel to read a card, open it in VS
 * Code or bring a suspended one back to review.
 */
@Component({
  selector: "wl-browser",
  imports: [RouterLink, TPipe, BundleHtml, Icon, MemoryPoint, CdkTrapFocus],
  templateUrl: "./browser.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Browser {
  /** From the query string: the shell's search, or the review items a summary links to. */
  readonly q = input<string | undefined>(undefined);
  readonly items = input<string | undefined>(undefined);

  private readonly library = inject(Library);
  private readonly session = inject(ReviewSession);
  private readonly clock = inject(Clock);
  private readonly toasts = inject(Toasts);
  private readonly router = inject(Router);
  protected readonly data = inject(AppData);
  protected readonly i18n = inject(I18n);
  protected readonly statuses = STATUSES;
  protected readonly statusKeys = STATUS_KEYS;

  protected readonly filters = signal<BrowserFilters>(NO_FILTERS);
  protected readonly selected = signal<string | undefined>(undefined);
  private readonly editorLink =
    viewChild<ElementRef<HTMLAnchorElement>>("editor");

  private readonly index = computed(() =>
    searchIndexOf(this.data.bundle()?.searchIndex),
  );
  private readonly rows = computed(() => {
    const snapshot = this.library.snapshot();
    return snapshot === undefined ? [] : browserRows(snapshot);
  });
  private readonly git = inject(GitStatus);
  private readonly cardActions = inject(CardActions);
  private readonly dialog = inject(Dialog);

  /** How each card differs from the last commit, for the mark in its row and the filter. */
  protected readonly gitChanges = computed(() => {
    const state = this.git.state();
    return state === undefined
      ? new Map<string, GitEntry["change"]>()
      : cardChanges(state);
  });
  /** Cards deleted since the last commit: no longer in the content, but still possible to bring back. */
  protected readonly deleted = computed(() => {
    const state = this.git.state();
    return state === undefined ? [] : deletedCards(state);
  });

  protected readonly result = computed(() =>
    filterRows(
      this.rows(),
      this.filters(),
      this.index(),
      new Set(this.gitChanges().keys()),
    ),
  );

  protected readonly options = computed(() => {
    const rows = this.rows();
    const sorted = (values: Iterable<string>) =>
      [...new Set(values)].sort((a, b) => a.localeCompare(b, "en"));
    return {
      domains: sorted(rows.map((row) => row.domain)),
      topics: (this.data.bundle()?.topics ?? []).map((topic) => ({
        path: topic.path,
        title: topic.title,
      })),
      tags: sorted(rows.flatMap((row) => row.tags)),
      types: sorted(rows.map((row) => row.type)),
    };
  });

  protected readonly panel = computed(() => {
    const item = this.selected();
    if (item === undefined) return undefined;
    const row = this.rows().find((candidate) => candidate.item === item);
    const card = this.data
      .bundle()
      ?.cards.find((candidate) => candidate.id === row?.cardId);
    if (row === undefined || card === undefined) return undefined;
    const root = this.data.status()?.contentPath;
    return {
      row,
      card,
      editor: root === undefined ? null : vscodeLink(root, card.file),
      topicLink: ["/topic", ...card.topic.split("/")],
    };
  });

  constructor() {
    effect(() => {
      const q = this.q() ?? "";
      const items = (this.items() ?? "")
        .split(",")
        .filter((item) => item !== "");
      untracked(() => {
        this.filters.update((filters) => ({ ...filters, q, items }));
      });
    });
    const release = inject(Keyboard).register((name) => this.onKey(name));
    inject(DestroyRef).onDestroy(release);
  }

  protected set<Key extends keyof BrowserFilters>(
    key: Key,
    value: BrowserFilters[Key],
  ): void {
    this.filters.update((filters) => ({ ...filters, [key]: value }));
  }

  protected clear(): void {
    this.filters.set(NO_FILTERS);
    void this.router.navigate([], { queryParams: {} });
  }

  protected rowTitle(row: BrowserRow): string {
    return row.multi ? `${row.title} · ${row.variant}` : row.title;
  }

  protected r(row: BrowserRow): string {
    return row.retrievability === null
      ? this.i18n.t("context.new")
      : percent(this.i18n.lang(), row.retrievability);
  }

  protected due(row: BrowserRow): string {
    if (row.dueAt === null) return this.i18n.t("context.new");
    const now = this.library.snapshot()?.now.getTime() ?? row.dueAt;
    return row.dueAt <= now
      ? this.i18n.t("due.today")
      : this.i18n.t("due.in", {
          interval: intervalLabel(this.i18n.lang(), row.dueAt - now),
        });
  }

  protected rating(row: BrowserRow): string {
    const key =
      row.lastRating === null ? undefined : RATING_KEYS[row.lastRating];
    return key === undefined ? "—" : this.i18n.t(key);
  }

  protected unsuspend(item: string): void {
    const origin = this.session.context()?.origin;
    if (origin === undefined) return;
    void this.data.append([unsuspendEvent(origin, this.clock.now(), item)]);
    this.toasts.show(this.i18n.t("toast.unsuspended"));
  }

  protected archive(cardId: string): void {
    void this.cardActions.archive(cardId);
  }

  protected unarchive(cardId: string): void {
    void this.cardActions.unarchive(cardId);
  }

  protected restore(cardId: string): void {
    void this.cardActions.restore(cardId);
  }

  /**
   * Deleting asks first. Whether the card has history decides the question: the log is read here, where
   * the events already are, rather than asked of the server.
   */
  protected remove(cardId: string, title: string, lang: string): void {
    // From the replayed rows, not the raw log: a rating taken back with undo leaves no history behind.
    const history = this.rows().some(
      (row) => row.cardId === cardId && row.lastRating !== null,
    );
    const config = new DialogConfig<
      ConfirmDeleteData,
      DialogRef<DeleteChoice>
    >();
    config.data = { title, lang, history };
    config.ariaLabelledBy = "confirm-title";
    config.autoFocus = "first-tabbable";
    config.restoreFocus = true;
    config.panelClass = "dialog-panel";
    config.backdropClass = "dialog-backdrop";
    const ref = this.dialog.open<DeleteChoice, ConfirmDeleteData>(
      ConfirmDelete,
      config,
    );
    ref.closed.subscribe((choice) => {
      if (choice === "archive") void this.cardActions.archive(cardId);
      if (choice === "delete")
        void this.cardActions.delete(cardId).then((done) => {
          if (done) this.selected.set(undefined);
        });
    });
  }

  private onKey(name: string): boolean {
    const panel = this.panel();
    if (panel === undefined) return false;
    switch (name) {
      case "Escape":
        this.selected.set(undefined);
        return true;
      case "e":
        this.editorLink()?.nativeElement.click();
        return true;
      case "o":
        void this.router.navigate(panel.topicLink);
        return true;
      default:
        return false;
    }
  }
}
