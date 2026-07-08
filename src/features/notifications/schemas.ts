import { z } from "zod";

// POST /notifications/read — { ids?: [...] }; omit/empty => mark all read.
// strictObject => unknown fields are rejected (docs/security.md).
export const markReadSchema = z.strictObject({
  ids: z.array(z.uuid()).max(500).optional(),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;
