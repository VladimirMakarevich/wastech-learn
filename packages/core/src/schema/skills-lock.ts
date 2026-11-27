import { z } from "zod";

/**
 * One skill in `skills-lock.json`. The framework writes entries for its own skills in the shape the
 * `skills` CLI writes for a local copy; fields it does not use pass through, so an entry the CLI wrote
 * survives a round trip unchanged.
 */
export const skillsLockEntrySchema = z.looseObject({
  source: z.string().optional(),
  sourceType: z.string().optional(),
  computedHash: z.string().optional(),
  installMode: z.string().optional(),
});
export type SkillsLockEntry = z.infer<typeof skillsLockEntrySchema>;

/**
 * `skills-lock.json` of a content repository, version 2 of the `skills` CLI's format. Skills installed
 * from elsewhere keep their entries, so `npx skills` and `wastech-learn init` can both maintain the file.
 */
export const skillsLockSchema = z.looseObject({
  version: z.literal(2),
  skills: z.record(z.string(), skillsLockEntrySchema),
});
export type SkillsLock = z.infer<typeof skillsLockSchema>;
