import { z } from "zod";

/**
 * Environment variable validation (Zod).
 *
 * In M0 the app must boot with ZERO configuration so the shell + design system
 * are viewable immediately. Therefore Supabase/Sentry vars are OPTIONAL here —
 * the Supabase client factories throw a clear error only if actually invoked
 * without configuration (see lib/supabase/*). Later milestones tighten this.
 *
 * NOTE: only `NEXT_PUBLIC_`-prefixed vars are referenced here because this module
 * is safe to import from client code. Server-only secrets (SUPABASE_SECRET_KEY,
 * SENTRY_AUTH_TOKEN) are read directly where needed on the server — never here.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

// Reference each var statically so Next.js can inline it into the client bundle.
const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

if (!parsed.success) {
  // Malformed (as opposed to merely absent) values are a real misconfiguration.
  console.warn(
    "[env] Some public environment variables are invalid:",
    parsed.error.flatten().fieldErrors,
  );
}

export const env = parsed.success ? parsed.data : {};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
