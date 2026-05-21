# When to use this
Pre-PR sanity check on changed code. There is no test suite in this repo and no lint CI — this is the only safety net before merging.

## Arguments
`$ARGUMENTS` — what to review. One of:
- `changed` (default if omitted) — files in `git status` + uncommitted diff
- `<path>` — a specific file or directory
- a single feature folder, e.g. `components/orders`

## What to do
1. List target files (`git diff --name-only` for `changed`, or `find` for paths).
2. Run, in parallel, capturing exit codes (do NOT block):
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build` only if user explicitly asks (slow — Prisma generate + Next build)
3. For each changed file, check:
   - **API routes** (`app/api/**/route.ts`) match the canonical pattern in `app/api/CLAUDE.md`:
     - `await auth()` before any DB call
     - admin role gate on mutations
     - error responses are generic `{ error: '...' }`, not raw Prisma messages
     - multi-step writes use `prisma.$transaction`
   - **Components** (`components/**/*.tsx`):
     - `'use client'` only when needed (look for `useState`/`useEffect`/event handlers)
     - icons from `lucide-react`, classes merged with `cn()`, toasts via `sonner`
     - no inline `new PrismaClient()` (never allowed in client code anyway, but check)
   - **Server actions** (`lib/actions/*.ts`):
     - `'use server';` at top
     - return `{ success, error }` shape — no thrown errors except `redirect`
     - `revalidatePath` called after writes
   - **Legacy pattern flag** — if changed code uses `lib/actions.ts`, `lib/schema.ts`, or `new PrismaClient()` from `lib/services/authService.ts`, report it as a regression.
   - **Security** — no secrets in client-bundled files, no raw user input concatenated into Prisma `where` clauses without parsing.
4. Print a structured report:
   ```
   REVIEW: <target>  (<n> files)
   ─────────────────────────────────────
   tsc:    ✅ / ❌ (count)
   lint:   ✅ / ❌ (count)
   patterns: ✅ / ⚠️ <list>
   legacy regressions: <list or "none">
   security: ✅ / ⚠️ <list>
   ─────────────────────────────────────
   ```
5. If anything is ❌, list the offending file:line and the fix needed. Do NOT auto-fix unless asked.

## Example output
```
REVIEW: changed   (4 files)
─────────────────────────────────────
tsc:     ✅
lint:    ⚠️  1 warning  (components/orders/OrdersTable.tsx:77 — react-hooks/exhaustive-deps disabled)
patterns: ✅
legacy regressions: none
security: ✅
─────────────────────────────────────
```
