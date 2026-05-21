# CLAUDE.md — lib/db/
_Last updated: 2026-05-21. If patterns in the codebase contradict this file, report it._

## § OWNS
Database layer: Prisma schema, generated client wrapper, and migrations.
- [lib/db/schema.prisma](lib/db/schema.prisma) — single source of truth (529 lines, ~30 models)
- [lib/db/db.ts](lib/db/db.ts) — Prisma client singleton (default export, Neon adapter)
- [lib/db/migrations/](lib/db/migrations) — active migration directory (configured via `package.json → prisma.schema`)
- [lib/db/seed.ts](lib/db/seed.ts) — `npm run db:seed` (uses `tsx`)
Must not contain: business logic, route handlers, UI.

## § CONVENTIONS
- Schema path is NON-default: `package.json` declares `"prisma": { "schema": "lib/db/schema.prisma" }`. Every Prisma CLI call uses this implicitly — never pass `--schema` manually, and never move the schema.
- Migrations live in `lib/db/migrations/`, NOT `prisma/migrations/`. The latter directory contains one stale `data-migration.sql` — ignore it.
- Connection: Neon serverless driver via `PrismaNeon` adapter. Required env vars: `DATABASE_URL` (pooled), `DIRECT_URL` (direct, used by Prisma migrate).
- Model naming: PascalCase plural (`Orders`, `OrderItems`, `Clients`, `Autoparts`, `Warehouses`). FK columns: snake_case (`client_id`, `autopart_id`, `warehouse_id`, `orderStatus_id`). Don't introduce camelCase FKs in new fields.
- All `create*/update*` timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.

## § CURRENT PATTERNS ✓
- Import the singleton: `import prisma from '@/lib/db/db'` (default export, named `db` works too — same module).
- Multi-step writes use `prisma.$transaction(async (tx) => { ... })` — see [app/api/orders/route.ts:178-229](app/api/orders/route.ts:178).
- Explicit `include` for relations (no global `select *` shortcut). Example: orders fetch always includes `client`, `deliveryMethod`, `orderStatus`, `orderItems.autopart.brand`, `orderItems.warehouse`.
- `cuid()` for string PKs (`Orders.id`, `Clients.id`, `Autoparts.id`); `autoincrement()` for lookup tables (`OrderStatuses.id`, `Warehouses.id`).
- Migration workflow: edit `lib/db/schema.prisma` → `npm run db:migrate` (creates a timestamped migration, applies it to local DB, regenerates the client). Migration folder name format: `YYYYMMDDHHMMSS_<snake_description>`.

## § LEGACY PATTERNS ✗ (DO NOT REPLICATE)
- Large commented-out `prismaClientSingleton` block at top of [lib/db/db.ts](lib/db/db.ts) — leftover from the pre-Neon setup. Don't restore.
- `prisma/migrations/data-migration.sql` — stray file outside the active migrations dir. Don't add things here.
- Inline `new PrismaClient()` (seen in [lib/services/authService.ts](lib/services/authService.ts)) — defeats Neon pooling. Always use the singleton.

## § SUBAGENT CONTEXT
Prisma 6 schema and client for a Neon serverless Postgres database. Schema path is non-standard: `lib/db/schema.prisma` (declared in `package.json → prisma.schema`); migrations folder is `lib/db/migrations/` (NOT `prisma/migrations/`). The client uses the Neon HTTP adapter (`@prisma/adapter-neon`) — therefore you MUST import the singleton from `@/lib/db/db` and NEVER instantiate `new PrismaClient()`, because each fresh instance opens its own pool. Model names are PascalCase plural; FK columns are snake_case. Migration commands: `npm run db:migrate` (dev), `npm run db:push` (no migration file), `npm run db:reset` (destructive). Production deploys via Vercel — `npm run build` runs `prisma generate` first; migrations are NOT auto-applied (the `migrate deploy` command is intentionally not in the build script and is in the deny list).

## § TOKEN RULES
- Read file before editing. Never assume its current content.
- Output diffs only (±5 lines context). Never reprint whole files unless new or <30 lines.
- Confirmation gate required before: file deletion, schema migration, env var rename, auth logic change, any write outside this directory's scope.
