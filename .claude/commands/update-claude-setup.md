# When to use this
Re-run the deep discovery from the original workspace setup and diff findings against current `CLAUDE.md` files and slash commands. Use whenever the stack, conventions, or tooling have moved (a new lib added, lint config changed, test suite introduced, monorepo split, etc.).

## What to do
1. Re-run Phase 1 of the setup protocol:
   - **1a Config files** — `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `components.json`, `.github/workflows/*`, `.husky/*` (if added).
   - **1b Docs** — `README.md`, `CONTRIBUTING.md` (if added), `docs/**`, any new `*_GUIDE.md`.
   - **1c Structure** — top-level dirs to depth 4.
   - **1d Git** — `git log --oneline -50` + `git log --since="3 months ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -30`.
   - **1e Recent files** — 3–5 representative files from the most-changed dirs.
   - **1f Tooling** — husky, lint-staged, pre-commit, CI checks, .vscode.
2. Hold detected state in scratch, then read each existing `CLAUDE.md` and slash command.
3. Produce a structured diff:
   ```
   STACK CHANGES
     <added/removed/changed deps>
   CONVENTION DRIFT
     <patterns now in use that the CLAUDE.md does not mention>
     <patterns CLAUDE.md asserts that no longer appear in recent files>
   NEW LEGACY
     <dirs / files / patterns absent from recent commits — candidates for "DO NOT REPLICATE">
   TOOLING CHANGES
     <hooks now present that .claude/settings.json duplicates, etc.>
   SLASH COMMANDS DRIFT
     <commands that reference paths / patterns that no longer exist>
   ```
4. **STOP and wait for approval** before modifying any `CLAUDE.md` or command. The diff is the deliverable.
5. After approval, apply the changes file-by-file with diffs (±5 lines), one approval per file.

## Example output
```
STACK CHANGES
  + vitest 1.6.0 (devDependency)
  + @testing-library/react 14.0.0
CONVENTION DRIFT
  components/CLAUDE.md says "no React Query" but @tanstack/react-query is now in deps
NEW LEGACY                none
TOOLING CHANGES
  .husky/pre-commit now runs `lint-staged` — settings.json typecheck hook duplicates this
SLASH COMMANDS DRIFT
  /new-component does not mention that tests should be co-located now that vitest exists
```
