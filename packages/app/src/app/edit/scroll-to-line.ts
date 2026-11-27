// Everything that decides where a wrapped line breaks; the mirror must break exactly where the field does.
const TYPE_PROPERTIES = [
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "tabSize",
  "textIndent",
  "textTransform",
  "wordSpacing",
  "paddingLeft",
  "paddingRight",
] as const;

/**
 * Scrolls a text field so the line that starts at `offset` sits near its top, two lines below the edge.
 * The field wraps long lines, and a summary's paragraphs are long lines, so counting line breaks would
 * land far above the target; the line's height is measured instead on a hidden copy of the text with
 * the field's width and type.
 */
export const scrollToLine = (
  area: HTMLTextAreaElement,
  offset: number,
): void => {
  const style = getComputedStyle(area);
  const document = area.ownerDocument;
  const mirror = document.createElement("div");
  for (const property of TYPE_PROPERTIES)
    mirror.style[property] = style[property];
  Object.assign(mirror.style, {
    position: "absolute",
    top: "0",
    left: "-9999px",
    visibility: "hidden",
    boxSizing: "border-box",
    width: `${String(area.clientWidth)}px`,
    paddingTop: "0",
    paddingBottom: "0",
    border: "0",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  });
  mirror.textContent = area.value.slice(0, offset);
  // A marker after the text starts where the target line starts; it needs a character to have a box.
  const marker = document.createElement("span");
  marker.textContent = area.value.slice(offset) || ".";
  mirror.append(marker);
  document.body.append(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  const lineHeight = Number.parseFloat(style.lineHeight);
  const paddingTop = Number.parseFloat(style.paddingTop);
  area.scrollTop = Math.max(
    0,
    top +
      (Number.isFinite(paddingTop) ? paddingTop : 0) -
      (Number.isFinite(lineHeight) ? 2 * lineHeight : 0),
  );
};
