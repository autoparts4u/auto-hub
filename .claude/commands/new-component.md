# When to use this
Scaffold a new feature component (`'use client'`) in the right `components/<feature>/` folder, matching the current `OrdersTable.tsx`-style pattern.

## Arguments
`$ARGUMENTS` — component name in PascalCase, optionally with a feature prefix.
Examples: `OrdersFilterBar`, `clients:ClientPicker`, `autoparts:StockBadge`.

If no feature prefix is given, infer the feature from the name (e.g. `OrdersFilterBar` → `orders/`); if ambiguous, ask which folder before creating the file.

## What to do
1. Determine target path: `components/<feature>/<Name>.tsx`. Feature folders today: `orders`, `clients`, `autoparts`, `reservations`, `purchases`, `analytics`, `admin`, `general`, `activity`, `layout`. Never put feature components under `components/ui/` (that is shadcn-only).
2. If the file already exists, ABORT and tell the user.
3. Read `components/CLAUDE.md` for current conventions. Do not duplicate them inline.
4. Create the file with:
   - Line 1: `'use client';`
   - shadcn primitives from `@/components/ui/*`, icons from `lucide-react`, `cn` from `@/lib/utils`, `toast` from `sonner` if mutations are involved.
   - Default export, PascalCase, named like the file.
   - Russian UI strings; English identifiers.
5. If the component needs data, use plain `fetch('/api/<resource>?...')` + `useState` + `useEffect` (NOT React Query / SWR — not installed).
6. If the component is large enough to need sub-modals, co-locate them in the same folder as separate files (`<Name>Modal.tsx`, `<Name>DetailsModal.tsx`) — see [components/orders/](components/orders/).
7. Print the file path and a one-line summary of what was created.

## Example output
```
components/orders/OrdersFilterBar.tsx     (created, 48 lines)
```
