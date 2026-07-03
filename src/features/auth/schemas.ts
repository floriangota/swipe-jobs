import { z } from "zod";

// strictObject => unknown fields are rejected (docs/security.md).
// Password policy is NIST-minimal for M1: length only (min 8, max 72 = bcrypt's
// byte cap). Breached/common-password rejection is M9.

export const signupSchema = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(8, "min_8").max(72),
  role: z.enum(["worker", "employer"]),
  cityId: z.uuid().optional(),
  locale: z.enum(["sq", "en"]).default("sq"),
});

export const loginSchema = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(1).max(72),
});

export const requestResetSchema = z.strictObject({
  email: z.email().max(254),
});

export const updatePasswordSchema = z.strictObject({
  password: z.string().min(8, "min_8").max(72),
});

export const resendVerificationSchema = z.strictObject({
  email: z.email().max(254),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
