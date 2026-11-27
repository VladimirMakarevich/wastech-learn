import { CdkTrapFocus } from "@angular/cdk/a11y";
import { Dialog, DialogConfig, type DialogRef } from "@angular/cdk/dialog";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import type { CardEntry, GitEntry } from "@wastech-learn/core";
import { unsuspendEvent } from "@wastech-learn/session";
import { AppData } from "../../data/app-data";
import { CardActions } from "../../data/card-actions";
import {
  cardChanges,
  deletedCards,
  isCommittedCard,
} from "../../data/git-model";
import { GitStatus } from "../../data/git-state";
import { Clock } from "../../data/clock";
import { Library } from "../../data/library";
import { intervalLabel, percent } from "../../format/duration";
import { BundleHtml } from "../../html/bundle-html";
import type { MessageKey } from "../../i18n/en";
import { I18n } from "../../i18n/i18n";
import { TPipe } from "../../i18n/t.pipe";
import { Keyboard } from "../../keys/keyboard";
import { SourceEditor, type EditorClose } from "../../edit/source-editor";
import { UnsavedEdits } from "../../edit/unsaved-guard";
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

/** What the side panel shows for the chosen item. */
interface DrawerPanel {
  readonly row: BrowserRow;
  readonly card: CardEntry;
  readonly editor: string | null;
  readonly topicLink: readonly string[];
}

/**
 * The card browser: search over the bundle's index and filters by domain, topic, tag, type, status, leech and
 * changed, a table with R, due, lapses and the last rating, and a side panel to read a card, open it in VS
 * Code or bring a suspended one back to review.
 */
@Component({
  selector: "wl-browser",
  imports: [
    RouterLink,
    TPipe,
    BundleHtml,
    Icon,
    MemoryPoint,
    CdkTrapFocus,
    SourceEditor,
  ],
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
  private readonly editButton =
    viewChild<ElementRef<HTMLButtonElement>>("editButton");
  private readonly unsaved = inject(UnsavedEdits);
  private readonly injector = inject(Injector);
  /**
   * The panel whose card is open as text. It is held here rather than read from the table, so a reload
   * that drops the row (the card moved or deleted elsewhere) leaves the editor and its text in place;
   * choosing another card, which asks first, closes it.
   */
  protected readonly editing = linkedSignal<
    string | undefined,
    DrawerPanel | undefined
  >({
    source: this.selected,
    computation: () => undefined,
  });

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
    const present = new Set(this.rows().map((row) => row.cardId));
    return state === undefined ? [] : deletedCards(state, present);
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

  protected readonly panel = computed((): DrawerPanel | undefined => {
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

  /** What the side panel shows: the card being edited, else the chosen row's card. */
  protected readonly drawer = computed(() => this.editing() ?? this.panel());

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

  /** Another card, or none, after the learner agreed to drop an unsaved edit of this one. */
  protected async select(item: string | undefined): Promise<void> {
    if (item === this.selected()) return;
    if (this.editing() !== undefined && !(await this.unsaved.mayDiscard()))
      return;
    this.selected.set(item);
  }

  protected edit(): void {
    this.editing.set(this.panel());
  }

  /**
   * Back to the card, with focus on the button that opened the editor. After "new card" the old card is
   * retired with the old text, so the panel moves to the card that now holds the edited text.
   */
  protected closeEditor(close: EditorClose): void {
    this.editing.set(undefined);
    const card = close.kind === "saved" ? close.card : undefined;
    if (card !== undefined && card.retired !== null) {
      const successor = this.rows().find((row) => row.cardId === card.id);
      if (successor !== undefined) this.selected.set(successor.item);
    }
    afterNextRender(
      () => {
        this.editButton()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
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
    const committed = isCommittedCard(this.git.state(), cardId);
    config.data = { title, lang, history, committed };
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
        void this.cardActions.delete(cardId, committed).then((done) => {
          if (done) this.selected.set(undefined);
        });
    });
  }

  private onKey(name: string): boolean {
    const panel = this.panel();
    if (panel === undefined || this.editing() !== undefined) return false;
    switch (name) {
      case "Escape":
        this.selected.set(undefined);
        return true;
      case "e":
        this.edit();
        return true;
      case "Shift+e":
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
