import { z } from "zod";

// Coerce empty strings from the form to undefined before optional validation.
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());
}

const availabilityEnum = z.enum(["full_time", "part_time", "weekends", "evenings"]);
const experienceEnum = z.enum(["none", "under_1y", "1_3y", "over_3y"]);

export const workerProfileSchema = z.strictObject({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  bio: optional(z.string().trim().max(500)),
  experience_level: experienceEnum,
  phone: optional(z.string().trim().max(30)),
  availabilities: z.array(availabilityEnum).min(1).max(4),
  category_ids: z.array(z.uuid()).min(1).max(10),
  language_ids: z.array(z.uuid()).min(1).max(10),
});
export type WorkerProfileInput = z.infer<typeof workerProfileSchema>;

export const employerProfileSchema = z.strictObject({
  business_name: z.string().trim().min(1).max(150),
  business_type_id: optional(z.uuid()),
  description: optional(z.string().trim().max(1000)),
  contact_phone: optional(z.string().trim().max(30)),
  contact_email: optional(z.email().max(254)),
});
export type EmployerProfileInput = z.infer<typeof employerProfileSchema>;

export const visibilitySchema = z.strictObject({ is_visible: z.boolean() });
