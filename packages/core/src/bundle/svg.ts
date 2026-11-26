import type { Element, ElementContent } from "hast";
import { fromHtml } from "hast-util-from-html";

/**
 * Prepares a rendered diagram for inlining into a page next to other diagrams:
 * - the `<style>` block and the white background go, so the app's theme tokens color the diagram and the
 *   dark theme has no light plate;
 * - every id gets the given prefix, because Mermaid names every diagram `my-svg` and the arrow markers of
 *   a second diagram on the page would otherwise point at the first one.
 */
export const prepareSvg = (
  svgText: string,
  idPrefix: string,
): readonly ElementContent[] => {
  let text = svgText
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/background-color:\s*white;?/g, "")
    .trim();
  const rootId = /<svg\b[^>]*?\sid="([^"]+)"/.exec(text)?.[1];
  if (rootId !== undefined) {
    // Only ids and the references to them change; a label that happens to contain the id stays as written.
    const escaped = rootId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`(id="|#)${escaped}`, "g"), `$1${idPrefix}`);
  }
  return fromHtml(text, { fragment: true }).children.filter(
    (node): node is Element => node.type === "element",
  );
};

export const diagramFigure = (
  alt: string,
  svg: readonly ElementContent[],
): Element => ({
  type: "element",
  tagName: "span",
  properties: { className: ["diagram"], role: "img", ariaLabel: alt },
  children: [...svg],
});
