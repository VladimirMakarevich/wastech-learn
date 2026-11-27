import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { formatFinding, type Finding } from "@wastech-learn/core";
import { AppData } from "../data/app-data";
import { I18n } from "../i18n/i18n";
import { TPipe } from "../i18n/t.pipe";
import { vscodeLink } from "./vscode";

/** At most this many findings; the rest is one `check` run away and would only push the content down. */
const SHOWN = 3;

interface Line {
  readonly text: string;
  readonly where: string;
  readonly href: string;
}

/**
 * Says that the latest edit did not build and where, while the app keeps working on the last bundle that
 * did. Findings are formatted by core's catalog in the interface language, like the CLI's.
 */
@Component({
  selector: "wl-build-banner",
  imports: [TPipe],
  template: `@if (failure(); as failure) {
    <section class="banner" role="alert">
      <p>
        @if (failure.findings.length > 0 || failure.error === null) {
          {{ "banner.build-failed" | t }}
        } @else {
          {{ "banner.build-error" | t: { code: failure.error } }}
        }
      </p>
      @if (lines().length > 0) {
        <ul>
          @for (line of lines(); track $index) {
            <li>
              <a [href]="line.href">{{ line.where }}</a>
              <span>{{ line.text }}</span>
            </li>
          }
        </ul>
      }
    </section>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildBanner {
  private readonly data = inject(AppData);
  private readonly i18n = inject(I18n);
  protected readonly failure = this.data.buildFailure;

  protected readonly lines = computed((): readonly Line[] => {
    const failure = this.failure();
    const root = this.data.status()?.contentPath;
    if (failure === null) return [];
    return failure.findings.slice(0, SHOWN).map((finding: Finding) => ({
      text: formatFinding(this.i18n.lang(), finding),
      where:
        finding.line === undefined
          ? finding.file
          : `${finding.file}:${String(finding.line)}`,
      href:
        root === undefined ? "#" : vscodeLink(root, finding.file, finding.line),
    }));
  });
}
