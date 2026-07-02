import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

// next-intl: point the plugin at our request config (cookie-based, no i18n routing).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 *
 * M0 baseline: functional and reasonably tight, but intentionally NOT the final
 * nonce-based policy. A strict, nonce-driven CSP (removing 'unsafe-inline' for
 * scripts) is finalized in M9 (see docs/security.md) once a proxy.ts is in place.
 * - `connect-src`: Supabase (REST + Realtime WSS). Sentry stays 'self' because we
 *   tunnel browser events through /monitoring (see withSentryConfig.tunnelRoute).
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
]
  .join("; ")
  .concat(isProd ? "; upgrade-insecure-requests" : "");

// Secure headers applied globally (docs/security.md "Secure headers (global)").
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HSTS only meaningfully applies over HTTPS (prod / Vercel).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The service worker must never be cached so clients pick up updates.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Source-map upload + release config. All read from env; when unset (e.g. local
  // dev without a Sentry project) the plugin no-ops gracefully.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Tunnel browser events through our own origin to keep CSP tight and dodge
  // ad-blockers. Requires server functions (fine on Vercel).
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
