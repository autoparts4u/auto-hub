# When to use this
You want to see what slash commands are wired up in this project. Run with no arguments.

## What to do
List all commands in `.claude/commands/`, each with one line: the first line under `# When to use this` from its file. Group as:

- **Scaffolds** — `new-component`, `new-route`, `new-api-route`, `new-server-action`
- **DB** — `db-migrate`
- **Quality** — `review`, `perf-check`
- **Workspace** — `remember`, `update-claude-setup`, `help`

For each, show an example invocation. Examples:

```
/new-component OrdersFilterBar         → components/orders/OrdersFilterBar.tsx
/new-api-route purchases/[id]/receive  → app/api/purchases/[id]/receive/route.ts
/new-server-action orderActions:cancel → lib/actions/orderActions.ts
/new-route dashboard/inventory         → app/dashboard/inventory/page.tsx
/db-migrate "add fuel type to autos"   → lib/db/migrations/<ts>_add_fuel_type_to_autos
/review changed                        → pre-PR checklist on `git diff` files
/perf-check app/dashboard              → audit RSC/'use client' boundary
/remember "use prisma not db in new code"
/update-claude-setup                   → re-run Phase 1 and diff
```

## Example output
A compact bulleted list, one line per command, followed by the example block above. Do not read every file — just print the description from each command file's first sentence.
