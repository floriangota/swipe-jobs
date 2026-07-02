# SwipeJobs

A two-sided, swipe-based job-matching PWA connecting **hourly / shift workers**
with **local businesses**, launching in **Ferizaj, Kosovo**.

> **Source of truth:** [`CLAUDE.md`](./CLAUDE.md) and [`docs/`](./docs). Read them
> before contributing. This README covers running the project; the docs define
> what it is and how it must be built.

**Current milestone: M0 — Foundation & Design System.** No product features are
built yet (see [`docs/roadmap.md`](./docs/roadmap.md)). What exists:

- Next.js 16 (App Router) + React 19 + TypeScript, PWA-ready.
- Design system: Tailwind v4 tokens (light + dark) and core components
  (button, input, card, bottom sheet, toast, skeleton) — browse them at `/styleguide`.
- Bilingual (Albanian + English) via `next-intl`, with a language switch.
- Supabase, Sentry, CI, and PWA wiring — connection-only, no tables or features.

---

## Prerequisites

- **Node.js 22 LTS** (minimum 20.9). An `.nvmrc` is provided — run `nvm use`.
- **npm** (project is npm-based; `package-lock.json` is the lockfile).

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional for M0 — the app runs without it)
cp .env.example .env.local   # then fill in values as you create the projects

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000>. The home page is the app shell; the component
library lives at <http://localhost:3000/styleguide>. Try the **language switch**
and **theme toggle** in the header.

> M0 runs with **zero configuration** — Supabase/Sentry are wired but dormant, so
> you can view the shell and design system immediately without any credentials.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (watch) |
| `npm run test:ci` | Vitest (single run, used in CI) |
| `npm run generate-icons` | Regenerate PWA icons (zero-dependency script) |

## Environment variables

See [`.env.example`](./.env.example) for the full list. Highlights:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — safe for the
  browser; the publishable key is **RLS-limited**.
- `SUPABASE_SECRET_KEY` — **server-only**, bypasses RLS. Never prefix `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SENTRY_DSN` — public; when empty, Sentry stays disabled.
- `SENTRY_AUTH_TOKEN` — build-time only (CI / Vercel), for source-map upload.

**Never commit `.env.local`.** Only `.env.example` is tracked. Use separate
Supabase projects and Sentry environments for **staging** and **production**.

## Project structure

```
src/
  app/              App Router: layout, home, /styleguide, /api/health, manifest, icons
  components/       ui/ (design system) + brand, header, theme toggle, language switch
  features/         feature-folders (empty scaffolds until their milestone)
  i18n/             next-intl config + cookie-based locale + request config
  lib/              env (Zod), supabase client/server factories, cn()
  stores/           Zustand (toast store)
  types/            next-intl type augmentation
messages/           en.json, sq.json (translation catalogs)
public/             service worker + generated PWA icons
scripts/            generate-icons.mjs
instrumentation*.ts, sentry.*.config.ts   Sentry wiring
```

## Design tokens

All tokens are defined CSS-first in [`src/app/globals.css`](./src/app/globals.css)
via Tailwind v4's `@theme`. Semantic tokens (`--color-primary`, `--color-background`,
…) are mapped with `@theme inline` so `bg-primary` / `text-foreground` re-theme
automatically when the `.dark` class is toggled. Components consume **semantic
utilities only** — never raw colors.

## Testing

Vitest + React Testing Library. Tests live beside code in `__tests__/` folders.
The **contact-hidden-until-match** release gate
([`src/app/api/health/__tests__/health.test.ts`](./src/app/api/health/__tests__/health.test.ts))
is stubbed with `todo`s until the profile/feed/match endpoints exist (M1+).

## CI/CD & deployment

- **CI** (`.github/workflows/ci.yml`): on every PR and push to `main`, runs
  lint → type-check → test → build, plus a gitleaks secret scan. Make these
  **required status checks** on `main`.
- **Deploys (Vercel):** connect the GitHub repo in the Vercel dashboard once.
  Then:
  - Every **pull request** gets an automatic **Preview Deployment** with its own
    URL (posted as a PR comment). Review the real UI there, not just the diff.
  - Merging to **`main`** triggers the **Production** deployment.
  - CI (GitHub Actions) and Vercel deploys run in parallel — do **not** also run
    `vercel deploy` inside Actions (it double-builds).
  - Set env vars per environment in Vercel; use non-production Supabase
    credentials for Preview.

## License

Private / proprietary.
