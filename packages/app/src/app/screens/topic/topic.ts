import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  Injector,
  computed,
  inject,
  input,
  linkedSignal,
  viewChild,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AppData } from "../../data/app-data";
import { CardActions } from "../../data/card-actions";
import { topicEntries } from "../../data/git-model";
import { GitStatus } from "../../data/git-state";
import { Library } from "../../data/library";
import { intervalLabel, percent } from "../../format/duration";
import { BundleHtml } from "../../html/bundle-html";
import type { MessageKey } from "../../i18n/en";
import { I18n } from "../../i18n/i18n";
import { sectionAnchor, sectionKey } from "../../i18n/sections";
import { TPipe } from "../../i18n/t.pipe";
import { Keyboard } from "../../keys/keyboard";
import { vscodeLink } from "../../shell/vscode";
import { SourceEditor, type EditorFile } from "../../edit/source-editor";
import { Icon } from "../../ui/icon";
import { MemoryPoint } from "../../ui/memory-point";

const SELF_CHECK = "Self-check";

/** Parsed as an inert document: nothing in it loads or runs while the items are counted. */
const selfCheckQuestions = (html: string): number =>
  new DOMParser()
    .parseFromString(html, "text/html")
    .body.querySelectorAll(":scope > ol > li, :scope > ul > li").length;

/**
 * A topic to read before reviewing it and after a mistake, after the prototype: its sections with a table of
 * contents in the interface language, the text in the topic's own, the self-check opened one question at a
 * time, and the topic's cards with their memory beside it.
 */
@Component({
  selector: "wl-topic",
  imports: [RouterLink, TPipe, BundleHtml, MemoryPoint, SourceEditor, Icon],
  templateUrl: "./topic.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topic {
  readonly domain = input.required<string>();
  readonly topic = input.required<string>();

  protected readonly data = inject(AppData);
  private readonly library = inject(Library);
  protected readonly i18n = inject(I18n);
  private readonly fragment = toSignal(inject(ActivatedRoute).fragment);
  /** The fragment already scrolled to, so a later render of the same topic leaves the reader where they are. */
  private scrolledTo: string | null = null;
  /** Self-check questions shown so far; the section starts closed, also when another topic opens here. */
  protected readonly shown = linkedSignal({
    source: () => `${this.domain()}/${this.topic()}`,
    computation: () => 0,
  });

  protected readonly meta = computed(() => {
    const path = `${this.domain()}/${this.topic()}`;
    return this.data
      .bundle()
      ?.topics.find((candidate) => candidate.path === path);
  });

  private readonly git = inject(GitStatus);
  private readonly cardActions = inject(CardActions);

  /**
   * This topic's files that differ from the last commit, named relative to the topic's folder, so the
   * reader sees what a Sync would send before opening the panel.
   */
  protected readonly uncommitted = computed(() => {
    const state = this.git.state();
    const path = `${this.domain()}/${this.topic()}`;
    if (state === undefined) return [];
    const prefix = `content/${path}/`;
    return topicEntries(state, path).map((entry) => ({
      path: entry.path,
      name: entry.path.startsWith(prefix)
        ? entry.path.slice(prefix.length)
        : entry.path,
      change: `git.change.${entry.change}` satisfies MessageKey,
    }));
  });

  protected setArchived(archived: boolean): void {
    void this.cardActions.topicStatus(
      `${this.domain()}/${this.topic()}`,
      archived ? "archived" : "active",
    );
  }

  protected readonly sections = computed(() =>
    (this.meta()?.summary ?? []).map((section) => {
      const key = sectionKey(section.name);
      return {
        name: section.name,
        title: key === undefined ? section.name : this.i18n.t(key),
        anchor: sectionAnchor(section.name),
        html: section.html,
        selfCheck: section.name === SELF_CHECK,
      };
    }),
  );

  /**
   * How many questions the self-check holds: the top-level items of its lists, the same items the section
   * reveals one at a time. An item's own nested list is part of that question, not another one.
   */
  protected readonly questions = computed(() => {
    const html =
      this.meta()?.summary.find((section) => section.name === SELF_CHECK)
        ?.html ?? "";
    return selfCheckQuestions(html);
  });

  /**
   * The topic's files the editor offers, in the order of its tabs: the summary first because it is what
   * the page shows, then the passport, then materials when the topic has them.
   */
  protected readonly files = computed((): readonly EditorFile[] => {
    const meta = this.meta();
    if (meta === undefined) return [];
    const dir = `content/${meta.path}`;
    return [
      ...(meta.summary.length > 0
        ? [{ path: `${dir}/summary.md`, label: "edit.tab.summary" as const }]
        : []),
      { path: `${dir}/index.md`, label: "edit.tab.index" },
      ...(meta.materialsHtml !== ""
        ? [
            {
              path: `${dir}/materials.md`,
              label: "edit.tab.materials" as const,
            },
          ]
        : []),
    ];
  });

  /** The file open in the editor and the section to start at, or `undefined` while the topic is read. */
  protected readonly editing = linkedSignal<
    string,
    | { readonly initial: string; readonly section: string | undefined }
    | undefined
  >({
    source: () => `${this.domain()}/${this.topic()}`,
    computation: () => undefined,
  });

  private readonly editButton =
    viewChild<ElementRef<HTMLButtonElement>>("editButton");
  private readonly materialsButton =
    viewChild<ElementRef<HTMLButtonElement>>("materialsButton");
  private readonly vscode = viewChild<ElementRef<HTMLAnchorElement>>("vscode");
  private readonly injector = inject(Injector);
  private returnFocus: "edit" | "materials" = "edit";

  /** VS Code opens the file the pencil would edit: the summary the page shows, not the passport. */
  protected readonly editorHref = computed(() => {
    const root = this.data.status()?.contentPath;
    const first = this.files()[0];
    return root === undefined || first === undefined
      ? null
      : vscodeLink(root, first.path);
  });

  protected readonly cards = computed(() => {
    const meta = this.meta();
    const snapshot = this.library.snapshot();
    if (meta === undefined || snapshot === undefined) return [];
    const lang = this.i18n.lang();
    const now = snapshot.now.getTime();
    const byId = new Map(snapshot.bundle.cards.map((card) => [card.id, card]));
    return meta.cards.flatMap((id) => {
      const card = byId.get(id);
      if (card === undefined) return [];
      const items = card.variants.map((variant) =>
        snapshot.state.items.get(`${id}:${variant}`),
      );
      const known = items.flatMap((item) =>
        item?.retrievability === null || item?.retrievability === undefined
          ? []
          : [item.retrievability],
      );
      const r =
        known.length === 0
          ? null
          : known.reduce((sum, value) => sum + value, 0) / known.length;
      const dues = items.flatMap((item) =>
        item?.dueAt === null || item?.dueAt === undefined ? [] : [item.dueAt],
      );
      const due = dues.length === 0 ? null : Math.min(...dues);
      return [
        {
          id,
          title: card.title,
          type: card.type,
          status: card.status,
          lang: card.lang,
          items: card.variants.map((variant) => `${id}:${variant}`).join(","),
          r,
          percent: r === null ? null : percent(lang, r),
          due:
            due === null
              ? this.i18n.t("context.new")
              : due <= now
                ? this.i18n.t("due.today")
                : this.i18n.t("due.in", {
                    interval: intervalLabel(lang, due - now),
                  }),
        },
      ];
    });
  });

  constructor() {
    const release = inject(Keyboard).register((name) => this.onKey(name));
    inject(DestroyRef).onDestroy(release);
    // The router scrolls the window to a fragment, but the page scrolls inside `main`, so the topic does it.
    afterRenderEffect(() => {
      const fragment = this.fragment() ?? null;
      if (this.sections().length === 0 || fragment === this.scrolledTo) return;
      this.scrolledTo = fragment;
      if (fragment !== null) this.scrollToSection(fragment);
    });
  }

  /** A click on the section already in the URL is no navigation for the router, so the link scrolls itself. */
  protected scrollToSection(anchor: string): void {
    document.getElementById(anchor)?.scrollIntoView({ block: "start" });
  }

  /**
   * Opens the editor on the topic's first file, at the section given or, without one, at the section
   * whose heading is the last one in the top fifth of the window or above it: the one being read. A short
   * section leaves the next heading in view too, so the band stays narrow.
   */
  protected edit(section?: string): void {
    const first = this.files()[0];
    if (first === undefined) return;
    if (section !== undefined) {
      this.returnFocus = "edit";
      this.editing.set({ initial: first.path, section });
      return;
    }
    const limit = window.innerHeight / 5;
    const reading = this.sections()
      .filter((section) => {
        const top = document
          .getElementById(section.anchor)
          ?.getBoundingClientRect().top;
        return top !== undefined && top <= limit;
      })
      .at(-1);
    this.returnFocus = "edit";
    this.editing.set({ initial: first.path, section: reading?.name });
  }

  protected editMaterials(): void {
    const materials = this.files().find((file) =>
      file.path.endsWith("/materials.md"),
    );
    if (materials === undefined) return;
    this.returnFocus = "materials";
    this.editing.set({ initial: materials.path, section: undefined });
  }

  /** Back to reading, with focus on the button that opened the editor. */
  protected closeEditor(): void {
    this.editing.set(undefined);
    afterNextRender(
      () => {
        const button =
          this.returnFocus === "materials"
            ? (this.materialsButton() ?? this.editButton())
            : this.editButton();
        button?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  private onKey(name: string): boolean {
    if (this.editing() !== undefined || this.meta() === undefined) return false;
    if (name === "e") {
      this.edit();
      return true;
    }
    if (name === "Shift+e") {
      this.vscode()?.nativeElement.click();
      return true;
    }
    return false;
  }

  protected showNextQuestion(): void {
    this.shown.update((count) => Math.min(this.questions(), count + 1));
  }
}
