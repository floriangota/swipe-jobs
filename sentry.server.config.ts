import * as Sentry from "@sentry/nextjs";

// Node.js runtime Sentry init.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  debug: false,
});
