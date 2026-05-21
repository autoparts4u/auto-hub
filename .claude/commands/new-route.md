# When to use this
Scaffold a new App Router page (and optional `layout.tsx`) in the right `app/` zone.

## Arguments
`$ARGUMENTS` — URL path under `app/` (no leading slash, no `page.tsx` suffix).
Examples: `dashboard/inventory`, `shop/categories/[slug]`, `(auth)/reset-password`.

## What to do
1. Resolve target folder: `app/<arguments>/`. If the folder exists already and contains `page.tsx`, abort.
2. Decide RSC vs `'use client'`:
   - If the path is under `dashboard/` and only displays data → default to a server component that calls `await auth()` + `prisma.<model>.findMany(...)` directly. Redirect if not admin (mirror [app/dashboard/layout.tsx:9](app/dashboard/layout.tsx:9)).
   - If the path needs interactive state (tabs, filter inputs, modals) → either keep the page a server component and put interactive parts in a separate `'use client'` component (preferred), or mark the whole page `'use client'` to match the older [app/dashboard/orders/page.tsx](app/dashboard/orders/page.tsx) style.
3. Create `page.tsx`. Optionally also create `layout.tsx` if this section needs its own chrome.
4. Do NOT create `loading.tsx` / `error.tsx` by default — none exist yet in the codebase. Add them only on explicit request.
5. For `app/dashboard/<slug>` routes: remind the user to add a nav entry to `navItems` in [components/layout/sidebar.tsx:24](components/layout/sidebar.tsx:24).
6. For dynamic params, use Next 15 signature: `{ params }: { params: Promise<{ id: string }> }` then `const { id } = await params`.
7. Reference `app/CLAUDE.md` for conventions; do not duplicate.

## Example output
```
app/dashboard/inventory/page.tsx          (created)
↳ remember to add { label: 'Склад', href: '/dashboard/inventory', icon: Boxes }
  to navItems in components/layout/sidebar.tsx
```
