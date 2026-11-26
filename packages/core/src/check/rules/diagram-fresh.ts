import type { Finding } from "../../finding.js";
import { sha256Hex } from "../../hash.js";
import type { Diagram } from "../../model.js";

const MARKER = /^<!-- source-sha256: ([0-9a-f]{64}) -->/;

/** The marker `render` writes as the first line of an SVG; its hash is of the source's UTF-8 bytes. */
export const sourceMarker = (sourceHash: string): string =>
  `<!-- source-sha256: ${sourceHash} -->`;

export const markerHash = (svgText: string): string | undefined =>
  MARKER.exec(svgText)?.[1];

/**
 * The SVG is what GitHub, the editor and the app show; a source edited without re-rendering means the
 * learner sees a diagram that no longer matches the text.
 */
export const checkDiagramFresh = async (
  diagrams: readonly Diagram[],
): Promise<readonly Finding[]> => {
  const findings: Finding[] = [];
  for (const diagram of diagrams) {
    if (diagram.svgText === undefined) {
      findings.push({
        ruleId: "diagram-svg-missing",
        severity: "error",
        file: diagram.source,
        params: {},
      });
      continue;
    }
    if (markerHash(diagram.svgText) !== (await sha256Hex(diagram.sourceText))) {
      findings.push({
        ruleId: "diagram-stale",
        severity: "error",
        file: diagram.svg,
        line: 1,
        params: { source: diagram.source },
      });
    }
  }
  return findings;
};
