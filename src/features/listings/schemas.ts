import { z } from "zod";

// Coerce empty strings from the form to undefined before optional validation.
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());
}

export const jobTypeEnum = z.enum(["full_time", "part_time", "shift", "temporary"]);
export const requiredExperienceEnum = z.enum(["none", "under_1y", "1_3y", "over_3y"]);
export const payPeriodEnum = z.enum(["hourly", "monthly"]);
export const listingStatusEnum = z.enum(["active", "paused", "closed"]);

// Pay is integer minor units (EUR cents). Never floats. €1,000,000 hard ceiling
// rejects fat-finger / overflow values; positive() enforces pay_min > 0.
const payCents = z.number().int().positive().max(100_000_000);

export const listingSchema = z
  .strictObject({
    category_id: z.uuid(),
    title: z.string().trim().min(1).max(80),
    description: optional(z.string().trim().max(1000)),
    job_type: jobTypeEnum,
    required_experience: requiredExperienceEnum,
    pay_min: payCents,
    pay_max: optional(payCents),
    pay_period: payPeriodEnum,
  })
  .refine((v) => v.pay_max == null || v.pay_max >= v.pay_min, {
    message: "pay_max must be greater than or equal to pay_min",
    path: ["pay_max"],
  });
export type ListingInput = z.infer<typeof listingSchema>;

export const listingStatusUpdateSchema = z.strictObject({ status: listingStatusEnum });
export type ListingStatusUpdate = z.infer<typeof listingStatusUpdateSchema>;
