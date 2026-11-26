import { z } from "zod";
import { mutationShape, repoPathSchema, requireRequestId } from "./common.js";

export const importPackageInputSchema = z.strictObject({
  path: repoPathSchema,
});
export type ImportPackageInput = z.infer<typeof importPackageInputSchema>;

export const archivePackageInputSchema = z
  .strictObject({
    path: repoPathSchema,
    ...mutationShape,
  })
  .superRefine(requireRequestId);
export type ArchivePackageInput = z.infer<typeof archivePackageInputSchema>;
