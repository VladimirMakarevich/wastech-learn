import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The framework checkout this CLI runs from. Both src/ and dist/ sit one level below the package, so one
 * path fits both; Node resolves the link a content repository reaches the package through, so this is
 * the checkout itself, never the repository's node_modules.
 */
export const FRAMEWORK_DIR = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);

/** The oldest Node the packages declare in `engines`; a test keeps the two equal. */
export const MIN_NODE_VERSION = "24.17.0";
