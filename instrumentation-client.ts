import * as Sentry from "@sentry/nextjs";

// Browser-side Sentry init (replaces the deprecated sentry.client.config.ts).
// Loaded automatically by Next.js — do not import this from instrumentation.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Only actually send events in production with a configured DSN.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && process.env.NODE_ENV === "production",
  // Keep tracing light for now to avoid quota burn; tune in M9.
  tracesSampleRate: 0.1,
  // Session Replay OFF — it can capture PII, which collides with the golden rule
  // (contact fields hidden pre-match). Revisit with masking in a later milestone.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  debug: false,
});

// Instruments App Router client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
