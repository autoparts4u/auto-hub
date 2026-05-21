# When to use this
Make a schema change and produce a Prisma migration. Use whenever a model, field, index, or enum changes in `lib/db/schema.prisma`.

## Arguments
`$ARGUMENTS` — short snake_case migration name in quotes.
Examples: `"add fuel type to autos"`, `"add tracking number index"`, `"rename autopart typo"`.

## What to do
1. Read [lib/db/schema.prisma](lib/db/schema.prisma) first — never assume the current shape (529 lines).
2. Make the requested change to the schema. Conventions:
   - Model names: PascalCase plural (`Orders`, `Clients`, `Autoparts`)
   - FK columns: snake_case (`client_id`, `autopart_id`)
   - Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
   - String PKs: `@id @default(cuid())`. Lookup tables: `@id @default(autoincrement())`
3. Show the diff (±5 lines) and **STOP for user confirmation** before running migrations — schema migrations are not auto-approved.
4. After approval, run:
   ```
   npm run db:migrate
   ```
   This uses `package.json → prisma.schema = "lib/db/schema.prisma"` and writes the new folder to `lib/db/migrations/<timestamp>_<name>/`.
5. Show the generated SQL (`lib/db/migrations/<new>/migration.sql`) and the list of TypeScript files that now have stale Prisma types (`git status`).
6. Run `npx tsc --noEmit` and report any type errors introduced by the schema change.
7. NEVER run `npx prisma migrate deploy` from this command — that is for production CI/CD and is in the deny list. Local dev is `db:migrate`. Vercel does NOT auto-migrate on deploy (only `prisma generate` runs in `npm run build`).

## Example output
```
lib/db/schema.prisma                                          (+8 / -2)
lib/db/migrations/20260521143012_add_tracking_index/
  migration.sql                                               (created)
TypeScript: ✅ no new errors
Next: review SQL, commit both files.
```
