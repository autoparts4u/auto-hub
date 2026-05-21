# When to use this
Audit a route or feature for Next.js 15 / React 19 performance smells. Most of this codebase pushes `'use client'` very high — this command surfaces where that costs us.

## Arguments
`$ARGUMENTS` — path to audit. Examples: `app/dashboard/orders`, `app/shop`, `components/autoparts`.

## What to do
1. List `.tsx` / `.ts` files under the target.
2. For each, flag:
   - **`'use client'` on a page.tsx** when the page mostly renders data and only a small subtree needs interactivity → suggest moving the `'use client'` down to the interactive subtree (e.g. just the filter bar, not the whole tab page). Concrete example to mimic: keep `page.tsx` as a server component that awaits `auth()` + Prisma, pass data into a `<FiltersAndTable initialData={...} />` client island.
   - **Waterfall `fetch` chains** — sequential `await fetch(...)` calls that could be `Promise.all`. The orders table already does this right ([components/orders/OrdersTable.tsx:144](components/orders/OrdersTable.tsx:144)); flag any place that doesn't.
   - **Missing `next/image`** — `<img src=...>` instead of `next/image` (less critical here since the catalog is mostly text).
   - **Missing `<Suspense>`** for slow data — relevant only when the page is a server component.
   - **Bundle bloat** — large client component pulling in heavy libs (`xlsx`, `recharts`) without dynamic import. Suggest `next/dynamic({ ssr: false })`.
   - **Refetch loops** — `useEffect` deps that include unstable references (objects/arrays/functions created inline).
   - **No memoization** of expensive list renderers in tables with >100 rows — flag if `.map(...)` over big data without `useMemo` for derived values.
3. Print a structured report:
   ```
   PERF AUDIT: <target>  (<n> files)
   ─────────────────────────────────────
   client-boundary smells:  <list>
   waterfall fetches:       <list>
   bundle hotspots:         <list>
   refetch loops:           <list>
   ─────────────────────────────────────
   ```
4. Suggest fixes inline; do NOT apply them unless asked.

## Example output
```
PERF AUDIT: app/dashboard/orders   (3 files)
─────────────────────────────────────
client-boundary smells:
  app/dashboard/orders/page.tsx:1 — whole page is 'use client' for tab state.
    → move tab state to URL ?tab=, keep page as RSC, fetch orders server-side.
waterfall fetches:   none
bundle hotspots:     none
refetch loops:       none
─────────────────────────────────────
```
