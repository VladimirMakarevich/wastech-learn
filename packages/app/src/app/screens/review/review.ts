import { LiveAnnouncer } from "@angular/cdk/a11y";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
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
import type { CardEntry } from "@wastech-learn/core";
import type { SessionMode } from "@wastech-learn/session";
import { buildQueue, type Rating } from "@wastech-learn/srs";
import { AppData } from "../../data/app-data";
import { CardActions } from "../../data/card-actions";
import { Library } from "../../data/library";
import { daysAgo, intervalLabel, percent } from "../../format/duration";
import { BundleHtml } from "../../html/bundle-html";
import { askedGap, type ClozeView } from "../../html/cloze";
import type { MessageKey } from "../../i18n/en";
import { I18n } from "../../i18n/i18n";
import { TPipe } from "../../i18n/t.pipe";
import { Keyboard } from "../../keys/keyboard";
import { Preferences } from "../../prefs/preferences";
import {
  ReviewSession,
  type Confidence,
  type Notice,
} from "../../session/review-session";
import { vscodeLink } from "../../shell/vscode";
import { SourceEditor } from "../../edit/source-editor";
import { UnsavedEdits } from "../../edit/unsaved-guard";
import { Speech } from "../../tts/speech";
import { Icon } from "../../ui/icon";
import { MemoryPoint } from "../../ui/memory-point";
import { Toasts } from "../../ui/toast";

const RATINGS = [
  { rating: 1, name: "rating.1", tone: "again" },
  { rating: 2, name: "rating.2", tone: "hard" },
  { rating: 3, name: "rating.3", tone: "good" },
  { rating: 4, name: "rating.4", tone: "easy" },
] as const satisfies readonly {
  rating: Rating;
  name: MessageKey;
  tone: string;
}[];

const CONFIDENCES = [
  { value: 1, label: "review.confidence-1" },
  { value: 2, label: "review.confidence-2" },
  { value: 3, label: "review.confidence-3" },
] as const satisfies readonly { value: Confidence; label: MessageKey }[];

const NOTICES: Readonly<Record<Notice, MessageKey>> = {
  undone: "toast.undone",
  suspended: "toast.suspended",
  buried: "toast.buried",
  leech: "toast.leech",
  reset: "toast.reset",
};

const CLOZE_TYPES: ReadonlySet<string> = new Set(["cloze", "grammar-cloze"]);

/** The `?mode=` of a link from Home: a number of minutes, or the whole queue. */
const modeOf = (raw: string | undefined, fallback: number): SessionMode => {
  if (raw === "all" || raw === undefined) return { kind: "full" };
  const minutes = Number(raw);
  return Number.isInteger(minutes) && minutes > 0
    ? { kind: "minutes", minutes }
    : { kind: "minutes", minutes: fallback };
};

/**
 * The review screen, after the prototype's Review: the question in one place, the confidence and the
 * reveal in the glass tray, then the answer below and four labelled ratings with their intervals. Every
 * step works from the keyboard; the logic lives in the session engine.
 */
@Component({
  selector: "wl-review",
  imports: [RouterLink, TPipe, BundleHtml, Icon, MemoryPoint, SourceEditor],
  templateUrl: "./review.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Review {
  /** From the query string: `5`, `10`, `15` minutes or `all`. */
  readonly mode = input<string | undefined>(undefined);

  protected readonly session = inject(ReviewSession);
  protected readonly data = inject(AppData);
  protected readonly i18n = inject(I18n);
  protected readonly speech = inject(Speech);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  private readonly cardActions = inject(CardActions);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly preferences = inject(Preferences);
  private readonly injector = inject(Injector);

  protected readonly ratings = RATINGS;
  protected readonly confidences = CONFIDENCES;
  protected readonly started = signal(false);
  private readonly library = inject(Library);

  /**
   * New cards the day still offers. A short session takes none of them, so an empty short session says
   * where they are instead of looking like a finished day.
   */
  protected readonly newWaiting = computed(() => {
    const snapshot = this.library.snapshot();
    if (snapshot === undefined) return 0;
    const { state, deck, context, now, estimates } = snapshot;
    return buildQueue(state, deck.cards, context.config, now, {
      mode: { kind: "full" },
      estimates,
    }).entries.filter((entry) => entry.kind === "new").length;
  });

  protected startFull(): void {
    this.session.start({ kind: "full" });
    void this.router.navigate([], {
      queryParams: { mode: "all" },
      replaceUrl: true,
    });
  }

  private readonly revealButton =
    viewChild<ElementRef<HTMLButtonElement>>("reveal");
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly editorLink =
    viewChild<ElementRef<HTMLAnchorElement>>("editor");
  private readonly spoken = viewChild<ElementRef<HTMLElement>>("spoken");

  protected readonly card = this.session.card;
  private readonly unsaved = inject(UnsavedEdits);
  /**
   * The card whose file is open as text. Only after the answer: the learner has seen what is wrong, and
   * the rating that follows applies to the corrected text. Another card closes a clean editor; one with
   * unsaved text stays on its card, because the session moves on by itself when the content changes
   * elsewhere (the card retired from a chat), and that must not throw the text away.
   */
  protected readonly editing = linkedSignal<
    string | undefined,
    CardEntry | undefined
  >({
    source: () => this.session.current()?.item,
    computation: (_item, previous) =>
      previous?.value !== undefined && untracked(() => this.unsaved.dirty())
        ? previous.value
        : undefined,
  });
  /** The card the screen is about: the one being edited, else the session's. */
  protected readonly shown = computed(() => this.editing() ?? this.card());
  protected readonly topic = this.session.topic;
  protected readonly revealed = computed(
    () => this.session.phase() === "answer",
  );
  protected readonly reverse = computed(
    () => this.session.variant() === "rev" && this.card()?.reverseHtml !== null,
  );
  protected readonly promptHtml = computed(() => {
    const card = this.card();
    if (card === undefined) return "";
    return this.reverse() ? (card.reverseHtml ?? "") : card.questionHtml;
  });
  protected readonly cloze = computed((): ClozeView | undefined => {
    const card = this.card();
    const asked = askedGap(this.session.variant());
    if (
      card === undefined ||
      asked === undefined ||
      !CLOZE_TYPES.has(card.type)
    )
      return undefined;
    return { asked, revealed: this.revealed() };
  });
  protected readonly isPolish = computed(() => {
    const card = this.card();
    return (
      card !== undefined && (card.lang === "pl" || this.topic()?.lang === "pl")
    );
  });
  /** Reading aloud must not give the answer away: the reverse side and cloze gaps speak after the reveal. */
  protected readonly canSpeak = computed(
    () =>
      this.speech.voice() !== undefined &&
      this.isPolish() &&
      (this.revealed() || (!this.reverse() && this.cloze() === undefined)),
  );
  protected readonly editorHref = computed(() => {
    const card = this.card();
    const root = this.data.status()?.contentPath;
    return card === undefined || root === undefined
      ? null
      : vscodeLink(root, card.file);
  });
  protected readonly topicLink = computed(() => {
    const topic = this.topic();
    return topic === undefined ? null : ["/topic", ...topic.path.split("/")];
  });

  protected readonly intervals = computed(() => {
    const lang = this.i18n.lang();
    return new Map(
      this.session
        .preview()
        .map((preview) => [
          preview.rating,
          intervalLabel(lang, preview.intervalMs),
        ]),
    );
  });

  protected readonly memoryPoints = computed(() => {
    const state = this.session.state();
    if (state === undefined) return [];
    const items = [
      ...state.answers.map((answer) => answer.entry.item),
      ...(state.current === undefined ? [] : [state.current.item]),
      ...state.queue.map((entry) => entry.item),
      ...state.pending.map((step) => step.entry.item),
    ];
    return [...new Set(items)].map((item) => ({
      item,
      retrievability: state.log.state.items.get(item)?.retrievability ?? null,
      current: item === state.current?.item,
    }));
  });

  protected readonly memoryLabel = computed(() => {
    const points = this.memoryPoints();
    const cards = this.i18n.t("count.cards", { count: points.length });
    const reviewed = points.filter((point) => point.retrievability !== null);
    if (reviewed.length === 0)
      return this.i18n.t("context.memory-new", { cards });
    const mean =
      reviewed.reduce((sum, point) => sum + (point.retrievability ?? 0), 0) /
      reviewed.length;
    return this.i18n.t("context.memory-label", {
      cards,
      percent: percent(this.i18n.lang(), mean),
    });
  });

  protected readonly facts = computed(() => {
    const memory = this.session.memory();
    const lang = this.i18n.lang();
    if (memory === undefined || memory.lastReviewAt === null) return undefined;
    return {
      retrievability: memory.retrievability,
      r:
        memory.retrievability === null
          ? "—"
          : percent(lang, memory.retrievability),
      stability: intervalLabel(lang, memory.stability * 86_400_000),
      lapses: this.i18n.number(memory.lapses),
      last: daysAgo(lang, memory.lastReviewAt, this.session.shownAt()),
    };
  });

  constructor() {
    const keyboard = inject(Keyboard);
    const release = keyboard.register((name) => this.onKey(name));
    inject(DestroyRef).onDestroy(release);

    // The content, the log and the scheduler arrive asynchronously; the session starts once all are there.
    effect(() => {
      if (this.started() || !this.data.ready()) return;
      untracked(() => {
        const mode = this.mode();
        if (!this.session.active() || mode !== undefined)
          this.session.start(modeOf(mode, this.preferences.sessionMinutes()));
        this.started.set(true);
      });
    });

    // A session whose queue ran out goes to its summary, unless it never had a card at all.
    effect(() => {
      const state = this.session.state();
      if (
        state === undefined ||
        state.current !== undefined ||
        state.answers.length === 0
      )
        return;
      untracked(() => {
        this.finish();
      });
    });

    effect(() => {
      const notice = this.session.notice();
      if (notice !== null)
        untracked(() => {
          this.toasts.show(this.i18n.t(NOTICES[notice.kind]));
          // Shown once: a later visit to this screen must not repeat what happened in an earlier one.
          this.session.notice.set(null);
        });
    });

    // The primary action of each step holds the focus, so the next key press acts on what is on screen
    // and the focus ring always shows where the learner is. A new card is announced once, not on reveal.
    let announced: string | undefined;
    effect(() => {
      const phase = this.session.phase();
      const item = this.session.current()?.item;
      const progress = this.session.progress();
      if (item === undefined) return;
      untracked(() => {
        if (item !== announced) {
          announced = item;
          void this.announcer.announce(
            this.i18n.t("review.card-of", {
              done: progress.done + 1,
              total: progress.total,
            }),
            "polite",
          );
        }
        afterNextRender(
          () => {
            const target =
              phase === "question"
                ? this.revealButton()?.nativeElement
                : this.host.nativeElement.querySelector<HTMLButtonElement>(
                    '[data-rating="3"]',
                  );
            target?.focus({ preventScroll: true });
          },
          { injector: this.injector },
        );
      });
    });
  }

  protected rate(rating: Rating): void {
    this.session.rate(rating);
  }

  protected pickConfidence(value: Confidence): void {
    this.session.setConfidence(
      this.session.confidence() === value ? undefined : value,
    );
  }

  protected speak(): void {
    if (!this.canSpeak()) return;
    this.speech.speak(this.spoken()?.nativeElement.textContent ?? "");
  }

  protected openVsCode(): void {
    this.editorLink()?.nativeElement.click();
  }

  protected openEditor(): void {
    if (this.revealed()) this.editing.set(this.card());
  }

  /** The card comes back with its answer, rebuilt from the saved file; focus returns to the ratings. */
  protected closeEditor(): void {
    this.editing.set(undefined);
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelector<HTMLButtonElement>('[data-rating="3"]')
          ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  /**
   * Archives the card on screen without a question: the session moves on at once, and the message offers
   * the way back, so a slip of the key costs one more press.
   */
  protected archive(): void {
    const cardId = this.session.setAside();
    if (cardId !== undefined) void this.cardActions.archive(cardId);
  }

  protected finish(): void {
    this.session.finish();
    void this.router.navigateByUrl("/session-end");
  }

  private onKey(name: string): boolean {
    if (this.session.current() === undefined || this.editing() !== undefined)
      return false;
    const answer = this.revealed();
    switch (name) {
      case "Space":
        if (answer) this.session.rate(3);
        else this.session.reveal();
        return true;
      case "1":
      case "2":
      case "3":
        if (answer) this.session.rate(Number(name) as Rating);
        else this.pickConfidence(Number(name) as Confidence);
        return true;
      case "4":
        if (!answer) return false;
        this.session.rate(4);
        return true;
      case "u":
      case "Ctrl+z":
        this.session.undo();
        return true;
      case "o": {
        const link = this.topicLink();
        if (link !== null) void this.router.navigate(link);
        return true;
      }
      case "e":
        this.openEditor();
        return answer;
      case "Shift+e":
        this.openVsCode();
        return true;
      case "!":
        this.session.suspend();
        return true;
      case "b":
        this.session.bury();
        return true;
      case "a":
        this.archive();
        return true;
      case "p":
        this.speak();
        return this.canSpeak();
      case "Escape":
        this.finish();
        return true;
      default:
        return false;
    }
  }
}
