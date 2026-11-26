import { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";

type AttributeDefinition = NonNullable<
  NonNullable<SanitizeSchema["attributes"]>[string]
>[number];

/**
 * Inline styles are needed by Shiki (theme colors as CSS variables), KaTeX (box metrics) and Mermaid
 * (label layout), but a style is also a way to load a remote URL. Declarations whose values hold no
 * parentheses or quotes cannot call `url()`, `image-set()` or `expression()`, and that is all three need.
 */
const DECLARATION = String.raw`-{0,2}[a-z][a-z-]*\s*:\s*[^;:()"'\\<>&]*`;
// Declarations are separated by a required `;`, so the pattern matches in one pass: an optional separator
// would let the engine try every split of a long semicolon-less style and backtrack exponentially.
const SAFE_STYLE = new RegExp(
  String.raw`^\s*(?:${DECLARATION}(?:;\s*${DECLARATION})*;?)?\s*$`,
  "i",
);

/**
 * Ids survive only with the prefixes the compiler itself gives: `dg-` for the inlined diagrams (their
 * markers point at them) and `user-content-` for footnotes. Any other id could clobber a global in the
 * page that renders the bundle.
 */
const SAFE_ID = /^(?:dg-|user-content-)[\w-]+$/;
const DIAGRAM_REFERENCE = /^url\(#dg-[\w-]+\)$/;

const SVG_TAGS = [
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "marker",
  "symbol",
  "use",
  "foreignObject",
  "filter",
  "feDropShadow",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "title",
  "desc",
];

const SVG_ATTRIBUTES: readonly AttributeDefinition[] = [
  "viewBox",
  "preserveAspectRatio",
  "xmlns",
  "d",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "dx",
  "dy",
  "points",
  "transform",
  "fill",
  "fillOpacity",
  "fillRule",
  "stroke",
  "strokeWidth",
  "strokeOpacity",
  "strokeDasharray",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeMiterlimit",
  "opacity",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "orient",
  "textAnchor",
  "dominantBaseline",
  "alignmentBaseline",
  "fontSize",
  "fontWeight",
  "stdDeviation",
  "floodColor",
  "floodOpacity",
  "offset",
  "stopColor",
  "stopOpacity",
  "gradientUnits",
  "patternUnits",
  ["markerEnd", DIAGRAM_REFERENCE],
  ["markerStart", DIAGRAM_REFERENCE],
  ["markerMid", DIAGRAM_REFERENCE],
  ["filter", DIAGRAM_REFERENCE],
  ["clipPath", DIAGRAM_REFERENCE],
  ["href", /^#dg-[\w-]+$/],
  ["xLinkHref", /^#dg-[\w-]+$/],
];

// What KaTeX emits next to its HTML so that screen readers and copy-paste get real math.
const MATHML_TAGS = [
  "math",
  "semantics",
  "annotation",
  "mrow",
  "mi",
  "mn",
  "mo",
  "ms",
  "mspace",
  "mtext",
  "msup",
  "msub",
  "msubsup",
  "mfrac",
  "msqrt",
  "mroot",
  "mstyle",
  "mpadded",
  "mphantom",
  "menclose",
  "mover",
  "munder",
  "munderover",
  "mtable",
  "mtr",
  "mtd",
  "mlabeledtr",
  "mmultiscripts",
  "mprescripts",
  "none",
];

const MATHML_ATTRIBUTES = [
  "display",
  "encoding",
  "mathvariant",
  "mathcolor",
  "stretchy",
  "fence",
  "separator",
  "lspace",
  "rspace",
  "minsize",
  "maxsize",
  "accent",
  "accentunder",
  "notation",
  "columnalign",
  "columnspacing",
  "rowspacing",
  "columnlines",
  "rowlines",
  "scriptlevel",
  "displaystyle",
  "depth",
  "voffset",
  "linethickness",
  "movablelimits",
  "symmetric",
  "largeop",
];

const defaults = (defaultSchema.attributes?.["*"] ?? []).filter(
  (definition) => definition !== "id",
);

/**
 * GitHub's sanitation, widened only for what the compiler itself produces: the SVG of Mermaid diagrams,
 * KaTeX's HTML and MathML, Shiki's highlighted code, and cloze spans. Scripts, event handlers, foreign
 * ids and remote styles are dropped, so the app can insert the bundle's HTML as is.
 */
export const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  clobber: ["ariaDescribedBy", "ariaLabelledBy", "name"],
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "span",
    ...SVG_TAGS,
    ...MATHML_TAGS,
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["rel", "noopener", "noreferrer"],
      ["target", "_blank"],
    ],
    span: ["dataCloze", "role", "ariaHidden"],
    svg: [
      ...SVG_ATTRIBUTES,
      "width",
      "height",
      "role",
      "ariaRoleDescription",
      "ariaHidden",
    ],
    "*": [
      ...defaults,
      "className",
      "ariaHidden",
      "ariaLabel",
      ["id", SAFE_ID],
      ["style", SAFE_STYLE],
      ...SVG_ATTRIBUTES,
      ...MATHML_ATTRIBUTES,
    ],
  },
};
