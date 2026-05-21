# When to use this
Scaffold a new HTTP route handler at `app/api/<path>/route.ts` using the canonical handler shape from `app/api/CLAUDE.md`.

## Arguments
`$ARGUMENTS` — URL path under `app/api/` (no leading slash, no `route.ts`).
Examples: `purchases/[id]/receive`, `inventory`, `orders/[id]/refund`.

Optionally append verbs: `inventory:GET,POST` (defaults to GET + POST if omitted).

## What to do
1. Resolve target: `app/api/<path>/route.ts`. If file exists, abort.
2. Create the file using the canonical pattern from [app/api/CLAUDE.md](app/api/CLAUDE.md):
   - `import { NextRequest, NextResponse } from 'next/server'`
   - `import { auth } from '@/lib/auth'`
   - `import prisma from '@/lib/db/db'` (default import, named `prisma`)
   - For each verb requested, export `async function <VERB>(...)`:
     - `const session = await auth()` → 401 if missing
     - For POST/PUT/DELETE: 403 unless `session.user.role === 'admin'` (unless the route is intentionally user-facing — e.g. `/api/orders/my`)
     - For dynamic params: `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`
     - Build `const where: Record<string, unknown> = {}` from `request.nextUrl.searchParams` (GET) or parse `await request.json()` (POST/PUT)
     - Call `prisma.<model>.findMany/create` with explicit `include`
     - Wrap multi-step writes in `prisma.$transaction(async (tx) => { ... })`
     - `try { ... } catch (error) { console.error('Error ...:', error); return NextResponse.json({ error: 'Failed to ...' }, { status: 500 }); }`
3. If a Prisma model name needs to be guessed, read `lib/db/schema.prisma` first — model names are PascalCase plural (`Orders`, `Clients`, `Autoparts`) and FK columns are snake_case.
4. If validation is involved, use or create a zod schema in `lib/validation/<feature>Schema.ts` — do NOT use ad-hoc `if (!body.x)` checks.
5. After mutations, add `revalidatePath('/...')` for affected pages.

## Example output
```
app/api/purchases/[id]/receive/route.ts   (created — POST, admin-only)
↳ uses prisma.purchases.update + prisma.$transaction
↳ added revalidatePath('/dashboard/orders')
```
