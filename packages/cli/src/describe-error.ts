import { isLearnError, type LearnError } from "@wastech-learn/core";
import { isServerError } from "@wastech-learn/server";
import { SCHEDULER_PACKAGE, isSrsError } from "@wastech-learn/srs";
import { UsageError, type translator } from "./context.js";

const describeLearnError = (
  error: LearnError,
  t: ReturnType<typeof translator>,
  root: string,
): string => {
  const file = error.file ?? "";
  switch (error.code) {
    case "config-invalid":
      return error.field === undefined || error.field === ""
        ? t("cli.error.config-json", { file })
        : t("cli.error.config-invalid", { file, field: error.field });
    case "event-invalid":
      return t("cli.error.event-invalid", { field: error.field ?? "" });
    case "repository-not-found":
      return t("cli.error.repository-not-found", { file, root });
    case "io-failed":
      return t("cli.error.io-failed", { file });
    case "render-failed":
      return t("cli.error.render-failed", { file });
    case "path-outside-content":
    case "request-id-reused":
    case "item-not-active":
    case "topic-exists":
    case "topic-not-found":
    case "card-not-found":
    case "package-not-found":
    case "nothing-to-undo":
    case "content-changed":
    case "search-index-invalid":
    case "id-unavailable":
      return t(`error.${error.code}`, { subject: error.subject ?? "" });
  }
};

/**
 * One line for anything a command threw, from the catalog in the reader's language: a usage error,
 * a typed error of the packages, or, last, an unexpected failure with its own message.
 */
export const describeError = (
  error: unknown,
  t: ReturnType<typeof translator>,
  root: string,
): string => {
  if (error instanceof UsageError) return t(error.key, error.params);
  if (isLearnError(error)) return describeLearnError(error, t, root);
  if (isServerError(error)) {
    return t("cli.error.port-in-use", { port: error.port });
  }
  if (isSrsError(error)) {
    return t("cli.error.scheduler-unsupported", {
      expected: SCHEDULER_PACKAGE,
    });
  }
  return t("cli.error.unexpected", {
    detail: error instanceof Error ? error.message : String(error),
  });
};
