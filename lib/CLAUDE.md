# CLAUDE.md — lib/
_Last updated: 2026-05-21. If patterns in the codebase contradict this file, report it._

## § OWNS
Shared utilities, server-side helpers, and domain logic that more than one zone uses. Subdirs:
- `actions/` — `'use server'` Server Actions (form mutations with `revalidatePath`)
- `validation/` — zod schemas (`<feature>Schema.ts`)
- `services/` — domain services (currently only `authService.ts`)
- `db/` — Prisma client + schema + migrations (own CLAUDE.md)
- `utils/` — pure helpers (e.g. `orderPaymentUtils.ts`)
- `hooks/` — custom React hooks (client-only, e.g. `useReservationBadge`)
- `activity/` — server-only session bookkeeping
Plus top-level: `auth.ts` (NextAuth config + `auth()`/`signIn`/`signOut` exports), `utils.ts` (`cn`, `getContrastTextColor`).
Must not contain: route handlers, page-specific UI.

## § CONVENTIONS
- Server-only files do NOT need `'use server'` unless they are Server Actions. Plain helpers like `lib/auth.ts` are imported by both server components and Route Handlers and stay module-scope.
- zod schemas: one file per feature, named export, `lib/validation/<feature>Schema.ts` (see [lib/validation/authSchema.ts](lib/validation/authSchema.ts)).
- Server Actions: file in `lib/actions/<feature>Actions.ts`, top of file `'use server';`, return `{ success: boolean, error?: string, ... }` — never throw across the boundary unless using `next/navigation`'s `redirect`.
- Prisma client: always `import prisma from '@/lib/db/db'` (or `db` in legacy files — same module).
- Never put secrets in non-`'use server'` files — Next will inline them client-side.

## § CURRENT PATTERNS ✓
- Server Action shape (canonical: [lib/actions/orderPaymentActions.ts](lib/actions/orderPaymentActions.ts)):
  ```ts
  'use server';
  import { auth } from '@/lib/auth';
  import db from '@/lib/db/db';
  import { revalidatePath } from 'next/cache';

  export async function addPartialPayment(orderId: string, amount: number) {
    const session = await auth();
    if (!session || session.user.role !== 'admin') return { success: false, error: '...' };
    // ... mutation, then:
    revalidatePath(`/dashboard/orders`);
    return { success: true };
  }
  ```
- Validation example: [lib/validation/authSchema.ts](lib/validation/authSchema.ts) — single named export `signUpSchema`, error messages in Russian, `.refine(...)` for cross-field rules.
- Auth helpers: `import { auth, signIn, signOut, handlers } from '@/lib/auth'`. The `auth()` function is the one source of session data — never re-implement.

## § LEGACY PATTERNS ✗ (DO NOT REPLICATE)
- [lib/actions.ts](lib/actions.ts) — top-level, uses [lib/executeAction.ts](lib/executeAction.ts) wrapper. New Server Actions go in `lib/actions/<feature>Actions.ts` and return `{ success, error }` directly.
- [lib/schema.ts](lib/schema.ts) — single file with mixed zod schemas. New schemas go in `lib/validation/<feature>Schema.ts`.
- [lib/services/authService.ts](lib/services/authService.ts) — instantiates `new PrismaClient()` inline. Breaks Neon pooling. Always import the singleton from `@/lib/db/db`.

## § SUBAGENT CONTEXT
Shared TypeScript helpers for a Next.js 15 + Prisma + NextAuth 5 app. Authoritative entrypoints: `@/lib/auth` (session + sign-in/sign-out), `@/lib/db/db` (Prisma client singleton — default export, always import don't instantiate), `@/lib/utils` (`cn` for Tailwind class merge, `getContrastTextColor`). Server Actions live in `lib/actions/<feature>Actions.ts`, marked `'use server'`, returning `{ success, error }` and calling `revalidatePath` after writes. zod schemas live in `lib/validation/<feature>Schema.ts` with named exports. The DB ORM is Prisma 6 against Neon serverless Postgres via `@prisma/adapter-neon` — never use raw SQL except in `lib/db/migrations/*`.

## § TOKEN RULES
- Read file before editing. Never assume its current content.
- Output diffs only (±5 lines context). Never reprint whole files unless new or <30 lines.
- Confirmation gate required before: file deletion, schema migration, env var rename, auth logic change, any write outside this directory's scope.
