# When to use this
Add a new Server Action to `lib/actions/<feature>Actions.ts`. Use this only when the caller is a form / button mutation that benefits from `revalidatePath` and avoiding the round-trip to `/api/*`. For data that a client component fetches with `useEffect`, use `/new-api-route` instead — that is the dominant pattern in this codebase.

## Arguments
`$ARGUMENTS` — `<file>:<actionName>`, e.g. `orderActions:cancelOrder`, `clientActions:archiveClient`.
If the file doesn't exist yet, it will be created.

## What to do
1. Resolve target: `lib/actions/<file>.ts`. Add to it (or create it).
2. If creating new, top of file: `'use server';`
3. Import:
   ```ts
   import { auth } from '@/lib/auth';
   import db from '@/lib/db/db';      // legacy callers expect `db`; or use `prisma` consistently
   import { revalidatePath } from 'next/cache';
   ```
4. Signature: `export async function <actionName>(<typed args>)` — Server Actions cannot accept arbitrary objects from forms; if input comes from `<form action>`, take `FormData` and parse with a zod schema from `lib/validation/`.
5. Return shape (canonical): `{ success: boolean; error?: string; data?: ... }` — NEVER throw across the boundary (except `next/navigation`'s `redirect`).
6. Body order:
   1. `await auth()` → return `{ success: false, error: '...' }` if unauthorized or wrong role
   2. zod validate inputs (if from FormData)
   3. Prisma mutation, wrapped in `$transaction` if multi-step
   4. `revalidatePath('/dashboard/<affected>')` for every affected route
   5. `return { success: true, data: ... }`
7. Reference: [lib/actions/orderPaymentActions.ts](lib/actions/orderPaymentActions.ts) — the canonical example.

## Example output
```
lib/actions/orderActions.ts               (created)
  + export async function cancelOrder(orderId: string)
    → auth admin check, prisma.orders.update, revalidatePath('/dashboard/orders')
```
