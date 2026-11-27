// What a browser host needs from core: the types, the schemas it validates server answers with, the
// message catalog, id generation and the search loader. The bundle compiler, `check` and the writers stay
// out: Shiki's grammars are imported dynamically there, and a bundler turns every one of them into a chunk
// of the app even when nothing calls the compiler.

export { LearnError, isLearnError } from "./errors.js";
export type { LearnErrorCode, LearnErrorDetails } from "./errors.js";

export { CARD_ID_PATTERN, CONTENT_LANGS, fieldPath } from "./schema/common.js";
export type { ContentLang } from "./schema/common.js";

export {
  FSRS_MODELS,
  UI_LANGUAGES,
  learnConfigSchema,
} from "./schema/config.js";
export type {
  DomainLimits,
  LearnConfig,
  SrsSettings,
  UiLanguage,
} from "./schema/config.js";

export { CARD_STATUSES, CARD_TYPES } from "./schema/front-matter.js";
export type { CardStatus, CardType } from "./schema/front-matter.js";

export { RULE_IDS } from "./finding.js";
export type { Finding, FindingParams, RuleId, Severity } from "./finding.js";

export type {
  Card,
  ContentModel,
  Diagram,
  ParsedContent,
  Topic,
  TopicDoc,
} from "./model.js";

export type {
  CardEntry,
  ContentBundle,
  DomainMeta,
  RubricItem,
  SummarySection,
  TopicMeta,
} from "./bundle/types.js";

export { CATALOGS, formatFinding, formatMessage } from "./messages/format.js";
export type { MessageParams } from "./messages/format.js";
export type { MessageKey } from "./messages/en.js";

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

export { newUlid } from "./id.js";
export type { RandomSource } from "./id.js";

export {
  INDEX_SECTIONS,
  SUMMARY_SECTIONS,
  LANGUAGE_SUMMARY_SECTIONS,
} from "./template.js";
export type { SummarySectionName } from "./template.js";

export { foldDiacritics, loadSearchIndex } from "./search/search.js";
export type {
  ContentSearchIndex,
  SearchFilters,
  SearchHit,
  SearchHitKind,
} from "./search/search.js";
