# CLAUDE.md — auto-hub (root)
_Last updated: 2026-05-21. If patterns in the codebase contradict this file, report it._

## § OWNS
Root-level rules for the whole repo: stack, scripts, package manager, git hygiene, what is forbidden everywhere. Per-zone rules live in nested `CLAUDE.md` files (`app/`, `app/api/`, `components/`, `lib/`, `lib/db/`). Never put zone-specific conventions here.

## § STACK
- Next.js **15.2.8** App Router, React 19, Turbopack dev (`npm run dev`)
- TypeScript strict, alias `@/*` → repo root (NOT `./src`)
- Tailwind CSS **v4** (`@tailwindcss/postcss`), shadcn/ui "new-york" + Radix, `lucide-react`, `sonner`
- Prisma **6.9** + `@prisma/adapter-neon` (Neon serverless Postgres)
- NextAuth **v5 beta** (Google + Credentials), `@auth/prisma-adapter`
- zod 3 for validation
- Package manager: **npm** (only `package-lock.json` exists)
- No tests, no Storybook, no monorepo

## § SCRIPTS
- `npm run dev` — Turbopack dev server
- `npm run build` — runs `prisma generate` then `next build`
- `npm run lint` — `next lint` (ESLint flat config in `eslint.config.mjs`)
- `npm run db:migrate` / `db:studio` / `db:push` / `db:reset` / `db:seed`
- `npx tsc --noEmit` — typecheck (no script wrapper)

## § CONVENTIONS (global)
- Comments and UI strings are usually **Russian**; identifiers, file names, commit messages — English.
- Commit prefixes used by the team: `feat:`, `fix:`, `fixes:`, occasionally bare ("Fix ..."). Match the style of recent commits in `git log`.
- Files at repo root like `ORDERS_FUNCTIONALITY.md`, `CLIENT_*.md` etc. are **historical feature notes** — do not add new ones at root; if a long-form doc is needed, place it next to the feature or in a future `docs/` dir.
- Never read `.env` / `.env.local`. The deploy-time kill-switch lives in `AppSettings.dbAccessEnabled` (see `middleware.ts`) — never disable it from code.

## § LEGACY PATTERNS ✗ (DO NOT REPLICATE)
- `lib/actions.ts` + `lib/executeAction.ts` — old wrapper style. Current code: `'use server'` files in `lib/actions/*.ts` returning `{ success, error }` directly (see [lib/actions/orderPaymentActions.ts](lib/actions/orderPaymentActions.ts)).
- `lib/schema.ts` — single-file mixed zod schemas. Current: `lib/validation/<feature>Schema.ts` (see [lib/validation/authSchema.ts](lib/validation/authSchema.ts)).
- `lib/services/authService.ts` — instantiates `new PrismaClient()` inline (breaks Neon pooling). Current: import the singleton from [lib/db/db.ts](lib/db/db.ts).
- `prisma/migrations/data-migration.sql` — stray dir; active migrations live in [lib/db/migrations](lib/db/migrations) per `package.json → prisma.schema`.
- Commented-out PrismaClient block at top of [lib/db/db.ts](lib/db/db.ts) — dead code, leave alone unless explicitly cleaning.

## § SUBAGENT CONTEXT
auto-hub is a Russian-language admin + customer storefront for an auto-parts business. Admin (`/dashboard`) manages clients, orders, autoparts (across multiple warehouses), reservations, returns, purchases, and analytics. Customers (`/shop`) browse a filtered catalog and place reservations/orders. Stack: Next.js 15 App Router on Vercel, Prisma 6 against Neon Postgres via the Neon serverless driver, NextAuth 5 (Google + email/password), shadcn/ui + Tailwind v4. There is no test suite and no lint CI — be conservative; the only safety net is `npm run build` and `npx tsc --noEmit`. The DB schema (`lib/db/schema.prisma`, 529 lines) is the source of truth — model names are PascalCase plural (`Orders`, `Clients`, `Autoparts`) and FK columns are snake_case (`client_id`, `autopart_id`).

## § TOKEN RULES
- Read file before editing. Never assume its current content.
- Output diffs only (±5 lines context). Never reprint whole files unless new or <30 lines.
- Confirmation gate required before: file deletion, schema migration, env var rename, auth logic change, any write outside this directory's scope.
