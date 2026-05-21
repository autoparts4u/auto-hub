# CLAUDE.md — app/
_Last updated: 2026-05-21. If patterns in the codebase contradict this file, report it._

## § OWNS
Routing layer (App Router). Three top-level zones:
- `app/(auth)/*` — sign-in / sign-up / confirm-account / add-phone (route group, no URL prefix)
- `app/dashboard/*` — admin UI, gated by `app/dashboard/layout.tsx` (`session.user.role === 'admin'` else `redirect('/shop')`)
- `app/shop/*` — customer-facing storefront
Plus: `app/api/*` (own CLAUDE.md), `app/types/*.ts` (shared TS interfaces), `app/layout.tsx` (root), `app/globals.css` (Tailwind v4 entry).
Must not contain: data-access logic (goes in `lib/`), UI atoms (go in `components/ui/`).

## § CONVENTIONS
- Route groups: `(auth)` for grouping without URL segment. New groups follow the same `(name)` pattern.
- Dynamic segments: `[id]` folder name → params is `Promise<{ id: string }>` in Next 15 (must `await params`). See [app/api/orders/[id]/route.ts](app/api/orders/[id]/route.ts:9).
- Shared types: `app/types/<feature>.ts` (PascalCase interfaces — `Order`, `OrderItem`, `Client`). Import as `@/app/types/orders`.
- Page files are `page.tsx`, layouts are `layout.tsx`. No `loading.tsx` / `error.tsx` exist yet — add them per-route if introducing Suspense or graceful error UI.
- `middleware.ts` (repo root) gates DB access via `AppSettings.dbAccessEnabled`. Don't add per-route auth checks to middleware — auth lives in route handlers via `await auth()`.

## § CURRENT PATTERNS ✓
- Admin layout pattern — server component, awaits `auth()`, redirects on role mismatch:
  [app/dashboard/layout.tsx:7-10](app/dashboard/layout.tsx:7)
- Tab pages are currently `'use client'` (see [app/dashboard/orders/page.tsx:1](app/dashboard/orders/page.tsx:1)). New pages may follow this pattern OR move tab state into RSC-friendly URL params — both acceptable.
- Root layout is minimal — only `<GlobalErrorHandler>` wrap + `<Toaster />` ([app/layout.tsx](app/layout.tsx)).
- Auth API handler: re-exports from NextAuth — [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts) wires `handlers.GET/POST` from `lib/auth.ts`.

## § LEGACY PATTERNS ✗ (DO NOT REPLICATE)
- Heavy `'use client'` at the page level pulls everything client-side and forfeits RSC benefits. Not forbidden, but prefer server components for new pages and push `'use client'` down to the smallest interactive subtree (e.g. just the filter bar, not the whole tab page).

## § SUBAGENT CONTEXT
This is the Next.js 15 App Router for a Russian-language auto-parts admin/storefront. Three URL zones: `(auth)` for sign-in flows, `/dashboard/*` for admins (role-gated in `app/dashboard/layout.tsx`), `/shop/*` for customers. Shared types live in `app/types/*.ts` (PascalCase interfaces, imported via `@/app/types/...`). The DB kill-switch in `middleware.ts` returns 503 when `AppSettings.dbAccessEnabled` is false — don't touch it. All API route handlers live under `app/api/` and follow the pattern documented in `app/api/CLAUDE.md`.

## § TOKEN RULES
- Read file before editing. Never assume its current content.
- Output diffs only (±5 lines context). Never reprint whole files unless new or <30 lines.
- Confirmation gate required before: file deletion, schema migration, env var rename, auth logic change, any write outside this directory's scope.
