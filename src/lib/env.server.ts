import "server-only";
import { z } from "zod";

/**
 * Server-only environment. Importing this from a Client Component is a build
 * error (`server-only`), so the SECRET keys here can never leak into the client
 * bundle. Values are read lazily via getServerEnv() and validated on first use,
 * so the app still boots for pages that don't need them.
 */
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  });

  if (!parsed.success) {
    const missing = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    throw new Error(
      `Missing/invalid server environment variables: ${missing}. See .env.example.`,
    );
  }

  cached = parsed.data;
  return cached;
}
