import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { AppData } from "../../data/app-data";
import { Library } from "../../data/library";
import { intervalLabel, percent } from "../../format/duration";
import { BundleHtml } from "../../html/bundle-html";
import { I18n } from "../../i18n/i18n";
import { sectionAnchor, sectionKey } from "../../i18n/sections";
import { TPipe } from "../../i18n/t.pipe";
import { vscodeLink } from "../../shell/vscode";
import { MemoryPoint } from "../../ui/memory-point";

const SELF_CHECK = "Self-check";

/**
 * A topic to read before reviewing it and after a mistake, after the prototype: its sections with a table of
 * contents in the interface language, the text in the topic's own, the self-check opened one question at a
 * time, and the topic's cards with their memory beside it.
 */
@Component({
  selector: "wl-topic",
  imports: [RouterLink, TPipe, BundleHtml, MemoryPoint],
  templateUrl: "./topic.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topic {
  readonly domain = input.required<string>();
  readonly topic = input.required<string>();

  protected readonly data = inject(AppData);
  private readonly library = inject(Library);
  protected readonly i18n = inject(I18n);
  /** Self-check questions shown so far; the section starts closed. */
  protected readonly shown = signal(0);

  protected readonly meta = computed(() => {
    const path = `${this.domain()}/${this.topic()}`;
    return this.data
      .bundle()
      ?.topics.find((candidate) => candidate.path === path);
  });

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

  /** How many questions the self-check holds: the items of its first list. */
  protected readonly questions = computed(() => {
    const html =
      this.meta()?.summary.find((section) => section.name === SELF_CHECK)
        ?.html ?? "";
    return (html.match(/<li[\s>]/g) ?? []).length;
  });

  protected readonly editorHref = computed(() => {
    const root = this.data.status()?.contentPath;
    const meta = this.meta();
    return root === undefined || meta === undefined
      ? null
      : vscodeLink(root, `content/${meta.path}/index.md`);
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

  protected showNextQuestion(): void {
    this.shown.update((count) => Math.min(this.questions(), count + 1));
  }
}
