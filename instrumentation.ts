import * as Sentry from "@sentry/nextjs";

// Next.js calls register() once when the server boots. We lazy-import the runtime
// specific Sentry config so each runtime (Node / Edge) initializes correctly.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in App Router Server Components / route handlers.
export const onRequestError = Sentry.captureRequestError;
