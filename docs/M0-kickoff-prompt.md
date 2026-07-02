# M0 Kickoff Prompt — paste this into Claude Code

> Use this as your FIRST message to Claude Code, after placing `CLAUDE.md` at the repo root and the
> `docs/` folder alongside it. Do not skip the "propose before building" step.

---

## The prompt

```
Read CLAUDE.md and every file in /docs before doing anything. They are the source of truth for
this project — follow them strictly and flag any conflict rather than guessing.

We are building milestone M0 ONLY (Foundation & Design System). Do NOT build any feature from
M1 or later. Do NOT add anything outside M0's scope.

M0 scope (from docs/roadmap.md):
- Next.js (App Router) + TypeScript + Tailwind, PWA-ready, with a clean feature-folder structure.
- A design system: tokens (color, typography, spacing, radius, motion) and core reusable
  components (button, input, card, bottom sheet, toast, skeleton loader). This is the flagship
  foundation — it must look polished, not like default Bootstrap.
- next-intl set up with sq + en message files and a working language switch.
- Supabase client wiring (env-based) for staging + prod — connection only, no tables/features yet.
- Sentry wired for error tracking.
- CI/CD: GitHub Actions running lint, type-check, test, and build; ready for Vercel preview + prod
  deploys.
- .env.example committed; real .env gitignored. No secrets in git.

Before writing any code:
1. Propose the full folder/file structure you intend to create.
2. List the exact dependencies (and why each is needed).
3. Describe the design-system token approach and how components will consume it.
4. Note any decision where the docs are ambiguous — ask me, don't assume.

Wait for my approval of that plan before writing code. When I approve, build M0, then show me how
to run it locally and how the preview deploy works. Keep everything boring and mainstream; the only
place for ambition is UI/UX craft.
```

---

## How to run each subsequent milestone

For M1 through M10, reuse the same pattern (swap the milestone number and scope):

```
Re-read CLAUDE.md and the relevant file(s) in /docs. We are now building milestone M{N} ONLY:
[paste that milestone's block from docs/roadmap.md].
Do not build ahead into M{N+1}. Propose a plan + file structure and wait for my approval before
writing code. Ask before any architectural decision or deviation from the docs.
```

## Your review checklist each milestone (you are the architect)
- Does it match `docs/database-schema.md` / `docs/api-contract.md` exactly?
- Is the **contact-hidden-until-match** rule respected wherever contact data appears?
- Is RLS on for any new table? Zod on any new input? Parameterized queries only?
- Any new dependency or pattern not in `CLAUDE.md`? → question it.
- Loading / empty / error states present on new screens?
- Did it quietly add a Phase-2 feature? → remove it, note it for the next contract.

## Tips
- Commit after each approved milestone so you can roll back cleanly.
- If Claude Code drifts, point it back to the specific doc/section rather than re-explaining.
- Keep milestones small; review the preview deploy (the actual UI), not just the code.
