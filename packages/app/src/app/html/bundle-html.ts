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
    });
  }
}
