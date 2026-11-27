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

export { newCardId, newUlid, newUniqueCardId } from "./id.js";
export type { RandomSource } from "./id.js";

export {
  BLOOM_LEVELS,
  FAMILIARITIES,
  GRADINGS,
  LANG_PAIRS,
  TOPIC_STATUSES,
} from "./schema/front-matter.js";
export type { BloomLevel } from "./schema/front-matter.js";
export { TOPIC_PATH_PATTERN, topicPathSchema } from "./schema/common.js";

export {
  CARD_SECTIONS,
  INDEX_SECTIONS,
  LANGUAGE_SUMMARY_SECTIONS,
  MATERIALS_TITLE_SUFFIX,
  MATERIAL_KINDS,
  MATERIAL_STATUSES,
  OPEN_QUESTIONS_SECTION,
  SUMMARY_SECTIONS,
  isLanguageDomain,
  summaryTemplateFor,
} from "./template.js";
export type {
  MaterialKind,
  MaterialStatus,
  SummarySectionName,
} from "./template.js";

export {
  PACKAGE_FORMAT,
  PACKAGE_SECTIONS,
  REQUIRED_PACKAGE_SECTIONS,
  learningPackageFrontMatterSchema,
} from "./schema/package.js";
export type { LearningPackageFrontMatter } from "./schema/package.js";
export { parseLearningPackage } from "./parse/package.js";
export type {
  CandidateCard,
  LearningPackage,
  PackageParse,
} from "./parse/package.js";

export {
  MUTATING_TOOLS,
  TOOL_INPUT_SCHEMAS,
  TOOL_NAMES,
  isToolName,
  requestLifetimeMs,
  toolInputJsonSchema,
} from "./schema/mcp/index.js";
export type { ToolInput, ToolName } from "./schema/mcp/index.js";
export type {
  AddCardsInput,
  CardFields,
  CardPatch,
  CardSource,
  CreateTopicInput,
  MaterialItem,
  PretestItem,
  SaveDiagramInput,
  SaveMaterialsInput,
  SaveSummaryInput,
  SearchInput,
  SummarySections,
  UpdateCardInput,
  ValidateInput,
} from "./schema/mcp/content.js";
export type { MutationInput } from "./schema/mcp/common.js";
export type {
  ArchivePackageInput,
  ImportPackageInput,
} from "./schema/mcp/package.js";
export { QUIZ_MODES } from "./schema/mcp/quiz.js";
export type {
  QuizNextInput,
  RecordReviewInput,
  RevealInput,
  UndoLastInput,
} from "./schema/mcp/quiz.js";

export {
  frontMatterText,
  readDocument,
  sectionMarkdown,
  withFrontMatterValue,
  withSection,
  writeDocument,
} from "./serialize/document.js";
export type {
  ContentDocument,
  DocumentSection,
  FrontMatterValue,
} from "./serialize/document.js";
export {
  cardDocument,
  patchCardDocument,
  rubricMarkdown,
  sourcesMarkdown,
  successorCardDocument,
} from "./serialize/card.js";
export type { NewCardMeta } from "./serialize/card.js";
export {
  cardLinkTarget,
  pretestMarkdown,
  topicIndexDocument,
  withCardLinks,
} from "./serialize/topic.js";
export type { CardLink, TopicIndexInput } from "./serialize/topic.js";
export {
  mergeSummary,
  summaryDocument,
  withSummarySections,
} from "./serialize/summary.js";
export type { SummaryInput } from "./serialize/summary.js";
export {
  materialsDocument,
  readMaterials,
  withMaterials,
} from "./serialize/materials.js";
export type { MaterialsInput } from "./serialize/materials.js";
export {
  LINK_PATTERN,
  linkParts,
  markdownLink,
  oneLine,
} from "./serialize/inline.js";

export {
  buildSearchIndex,
  foldDiacritics,
  loadSearchIndex,
} from "./search/search.js";
export type {
  ContentSearchIndex,
  SearchFilters,
  SearchHit,
  SearchHitKind,
} from "./search/search.js";

export { promptMarkdown, revealFor } from "./study/prompt.js";
export type { Reveal } from "./study/prompt.js";

export { postToolUseEventSchema } from "./schema/hook.js";
export type { PostToolUseEvent } from "./schema/hook.js";

export {
  APP_CARD_STATUSES,
  APP_TOPIC_STATUSES,
  CONTENT_WRITE_FAILURE_CODES,
  GIT_AREAS,
  GIT_BLOCK_REASONS,
  GIT_CHANGES,
  GIT_FAILURE_CODES,
  cardIdParamSchema,
  cardStatusBodySchema,
  commitMessageSchema,
  emptyBodySchema,
  gitBlockSchema,
  gitEntrySchema,
  gitFailureSchema,
  gitStateSchema,
  gitSyncBodySchema,
  gitSyncResultSchema,
  kebabParamSchema,
  parseAppBody,
  topicStatusBodySchema,
} from "./schema/app.js";
export type {
  CardStatusBody,
  ContentWriteFailureCode,
  GitArea,
  GitBlockReason,
  GitChange,
  GitEntry,
  GitFailure,
  GitFailureCode,
  GitState,
  GitSyncBody,
  GitSyncResult,
  TopicStatusBody,
} from "./schema/app.js";
