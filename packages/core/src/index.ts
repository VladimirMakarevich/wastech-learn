export { LearnError, isLearnError } from "./errors.js";
export type { LearnErrorCode, LearnErrorDetails } from "./errors.js";

export {
  CARD_ID_PATTERN,
  CONTENT_LANGS,
  KEBAB_PATTERN,
  ORIGINS,
  fieldPath,
  firstIssue,
} from "./schema/common.js";
export type { ContentLang, SchemaIssue } from "./schema/common.js";

export {
  FSRS_MODELS,
  UI_LANGUAGES,
  deviceFromHostname,
  learnConfigSchema,
  learnLocalSchema,
} from "./schema/config.js";
export type {
  DomainLimits,
  LearnConfig,
  LearnLocal,
  SrsSettings,
  UiLanguage,
} from "./schema/config.js";

export {
  CARD_STATUSES,
  CARD_TYPES,
  cardFrontMatterSchema,
  materialsFrontMatterSchema,
  summaryFrontMatterSchema,
  topicIndexFrontMatterSchema,
} from "./schema/front-matter.js";
export type {
  CardFrontMatter,
  CardStatus,
  CardType,
  MaterialsFrontMatter,
  SummaryFrontMatter,
  TopicIndexFrontMatter,
} from "./schema/front-matter.js";

export { RULE_IDS, compareFindings } from "./finding.js";
export type { Finding, FindingParams, RuleId, Severity } from "./finding.js";

export { contentHash, sha256Hex } from "./hash.js";

export type {
  Card,
  ContentModel,
  Diagram,
  ParsedContent,
  Topic,
  TopicDoc,
} from "./model.js";

export { parseContent } from "./parse/content.js";
export type { ContentFiles } from "./parse/content.js";
export { splitFrontMatter } from "./parse/front-matter.js";
export type { FrontMatterSplit } from "./parse/front-matter.js";
export { findSection, readSections } from "./parse/sections.js";
export type { Section, SectionedBody } from "./parse/sections.js";
export { clozeGapCounts, isClozeType, variantsFor } from "./parse/variants.js";

export { compileBundle } from "./bundle/compile.js";
export type { CompileOptions } from "./bundle/compile.js";
export type {
  CardEntry,
  ContentBundle,
  DomainMeta,
  RubricItem,
  SummarySection,
  TopicMeta,
} from "./bundle/types.js";

export { checkContent } from "./check/check.js";
export type { CheckInput, CheckResult } from "./check/check.js";
export { changedWordShare } from "./check/rules/active-edit.js";
export { markerHash, sourceMarker } from "./check/rules/diagram-fresh.js";
export {
  PRESET_COPY_FILE,
  checkPresetDrift,
  parseMdlintRules,
} from "./check/rules/preset-drift.js";

export { CATALOGS, formatFinding, formatMessage } from "./messages/format.js";
export type { MessageParams } from "./messages/format.js";
export type { MessageKey } from "./messages/en.js";
export type { Message, PluralMessage } from "./messages/types.js";

export {
  EVENT_KINDS,
  EVENT_VERSION,
  parseReviewEvent,
  reviewEventSchema,
} from "./schema/event.js";
export type {
  EventKind,
  ReviewEvent,
  ReviewEventParse,
} from "./schema/event.js";
