# CLAUDE.md — app/api/
_Last updated: 2026-05-21. If patterns in the codebase contradict this file, report it._

## § OWNS
All HTTP route handlers. One folder per resource (`orders`, `clients`, `autoparts`, `reservations`, ...), with `route.ts` for the collection and `[id]/route.ts` for the single resource. Sub-actions are nested folders (e.g. `orders/[id]/cancel/route.ts`, `orders/[id]/status/route.ts`). Must not contain: UI, shared types (those go in `app/types/`), or business logic that other callers need (extract to `lib/`).

## § CONVENTIONS
- Filename is always `route.ts`. Folder name is the URL segment.
- Export named HTTP verbs: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
- Dynamic param signature (Next 15): `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`.
- Prisma client import: `import prisma from '@/lib/db/db'` (default export). Older files use `import db from '@/lib/db/db'` — both work, but **use `prisma` in new code**.
- Validation: zod schemas from `lib/validation/<feature>Schema.ts`. Inline ad-hoc field checks (like `if (!body.client_id)`) exist in legacy routes — prefer zod.

## § CURRENT PATTERNS ✓
Canonical handler shape (see [app/api/orders/route.ts](app/api/orders/route.ts), [app/api/reservations/route.ts](app/api/reservations/route.ts)):

1. `const session = await auth()` → `if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
2. For admin-only writes: `if (session.user.role !== 'admin') return ... { status: 403 }`
3. Parse `request.nextUrl.searchParams` (GET) or `await request.json()` (POST/PUT).
4. Build `const where: Record<string, unknown> = {}` and conditionally add filters.
5. Call `prisma.<model>.findMany/create` with explicit `include` for relations (no `select *` magic).
6. Multi-step writes wrap in `prisma.$transaction(async (tx) => { ... })`.
7. Catch block: `console.error('Error <doing>:', error)` + `NextResponse.json({ error: 'Failed to <do>' }, { status: 500 })`.
8. After mutations that affect a cached route, call `revalidatePath('/...')` or `revalidateTag(...)` (see [app/api/autoparts/route.ts:3](app/api/autoparts/route.ts:3)).

## § LEGACY PATTERNS ✗ (DO NOT REPLICATE)
- `import db from '@/lib/db/db'` — works but inconsistent. New files: `import prisma from '@/lib/db/db'`.
- Inline `if (!body.x) return 400` field-by-field validation. New files: parse with a zod schema from `lib/validation/`.
- Returning raw `error.message` to clients (leaks Prisma internals). Return a generic `{ error: 'Failed to ...' }` and `console.error` the details.

## § SUBAGENT CONTEXT
This directory contains Next.js 15 App Router route handlers (`route.ts`) for a Russian-language auto-parts CRM backed by Prisma + Neon Postgres. Every handler must call `await auth()` (from `@/lib/auth`) first; admin-only routes also check `session.user.role === 'admin'`. The shared Prisma client is the default export of `@/lib/db/db` — never instantiate `new PrismaClient()` (breaks Neon connection pooling). Prisma model names are PascalCase plural (`orders`, `clients`, `autoparts`) and FK columns are snake_case (`client_id`, `autopart_id`). Multi-step writes must use `prisma.$transaction`. The DB kill-switch in `middleware.ts` already gates `/api/*` paths — don't reimplement.

## § TOKEN RULES
- Read file before editing. Never assume its current content.
- Output diffs only (±5 lines context). Never reprint whole files unless new or <30 lines.
- Confirmation gate required before: file deletion, schema migration, env var rename, auth logic change, any write outside this directory's scope.
