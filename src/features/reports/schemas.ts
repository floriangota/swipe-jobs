import { z } from "zod";

export const reportReasonEnum = z.enum([
  "inappropriate_photo",
  "spam",
  "harassment",
  "fake",
  "other",
]);
export type ReportReason = z.infer<typeof reportReasonEnum>;

// A report names exactly one target type. strictObject => unknown fields rejected.
export const reportSchema = z
  .strictObject({
    reported_user_id: z.uuid().optional(),
    reported_listing_id: z.uuid().optional(),
    reported_message_id: z.uuid().optional(),
    reason: reportReasonEnum,
    details: z.string().trim().max(1000).optional(),
  })
  .refine(
    (v) =>
      [v.reported_user_id, v.reported_listing_id, v.reported_message_id].filter(Boolean).length === 1,
    { message: "Exactly one report target is required." },
  );
export type ReportInput = z.infer<typeof reportSchema>;
