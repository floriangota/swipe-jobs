import { z } from "zod";

// strictObject => unknown fields rejected (docs/security.md).
export const photoReviewSchema = z.strictObject({
  decision: z.enum(["approved", "rejected"]),
});
export type PhotoReviewInput = z.infer<typeof photoReviewSchema>;

export const reportResolveSchema = z.strictObject({
  action: z.enum(["dismiss", "suspend_user", "remove_listing"]),
  note: z.string().trim().max(500).optional(),
});
export type ReportResolveInput = z.infer<typeof reportResolveSchema>;

export const suspendSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500),
});
export type SuspendInput = z.infer<typeof suspendSchema>;

export const categoryUpsertSchema = z.strictObject({
  id: z.uuid().optional(), // omit to create
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only."),
  name_sq: z.string().trim().min(1).max(60),
  name_en: z.string().trim().min(1).max(60),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});
export type CategoryUpsertInput = z.infer<typeof categoryUpsertSchema>;
