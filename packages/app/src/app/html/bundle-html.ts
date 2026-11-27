import {
  Directive,
  ElementRef,
  SecurityContext,
  computed,
  effect,
  inject,
  input,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { applyCloze, type ClozeView } from "./cloze";

/**
 * The one place the app puts HTML on the page. The bundle's HTML was sanitized by core's compiler against
 * an allowlist when it was built; Angular's own sanitizer would strip the SVG diagrams and Shiki's classes,
 * so it is bypassed here and nowhere else. Nothing but bundle fields may be bound to it.
 */
@Directive({ selector: "[wlBundleHtml]" })
export class BundleHtml {
  readonly wlBundleHtml = input.required<string>();
  /** For a cloze card: which gap to hide and whether the answer is revealed. */
  readonly cloze = input<ClozeView | undefined>(undefined);
  readonly clozePlaceholder = input("[…]");
  /** Shows only the first N items of the lists: self-check questions come one at a time. */
  readonly listShown = input<number | undefined>(undefined);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly trusted = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.wlBundleHtml()),
  );

  constructor() {
    effect(() => {
      const host = this.element.nativeElement;
      // Re-rendered from the bundle's HTML on every change, so revealing a cloze gap restores its answer.
      host.innerHTML =
        this.sanitizer.sanitize(SecurityContext.HTML, this.trusted()) ?? "";
      const view = this.cloze();
      if (view !== undefined) applyCloze(host, view, this.clozePlaceholder());
      const shown = this.listShown();
      if (shown !== undefined)
        host
          .querySelectorAll<HTMLElement>(":scope > ol > li, :scope > ul > li")
          .forEach((item, index) => {
            item.hidden = index >= shown;
          });
    });
  }
}
