# When to use this
Capture a new convention or rule during work and append it to the most appropriate `CLAUDE.md` file.

## Arguments
`$ARGUMENTS` — the rule, in natural language. Quotes optional.
Examples:
- `"always use prisma not db in new API routes"`
- `"client list should always be sorted by name not createdAt"`
- `"new shadcn components must be added with npx shadcn@latest add, never hand-copied"`

## What to do
1. Read the rule. Decide which `CLAUDE.md` it belongs in:
   - Global stack / scripts / forbidden things → `CLAUDE.md` (root)
   - Routing, page/layout shape, middleware → `app/CLAUDE.md`
   - Route handler shape, auth, validation → `app/api/CLAUDE.md`
   - Component naming, shadcn, fetch/toast patterns → `components/CLAUDE.md`
   - Server actions, validation, services, utils → `lib/CLAUDE.md`
   - Prisma schema, migrations, Neon → `lib/db/CLAUDE.md`
2. Show the user which file you picked and the proposed addition (which section: `§ CONVENTIONS` / `§ CURRENT PATTERNS ✓` / `§ LEGACY PATTERNS ✗`). Ask for confirmation before writing.
3. After confirmation:
   - Append to the right section. Keep it ONE concise line per rule.
   - Bump the `_Last updated:` date at the top of that file to today.
   - If the file is now over the 120-line hard limit, suggest splitting into a child file.
4. Print the diff (±5 lines) so the user sees what changed.

## Example output
```
Target: app/api/CLAUDE.md  §  CONVENTIONS
+ - List endpoints must accept ?sort=name|createdAt|... (default: name).
  _Last updated: 2026-05-21
```
