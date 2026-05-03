# Environment + paths

## Active worktree
**Always work out of:** `/Users/jasonburks/Documents/_AI_/_R1/.worktrees/runway-v3-cascade/`
Current branch: `feature/runway-flags-consolidation` (CC #1's branch, freshest runway code off `upstream/runway`).

The Runway feature **does not exist on `main`**. Only on runway branches. Do not cd to the main repo for runway code.

## Other worktrees
- `/Users/jasonburks/Documents/_AI_/_R1/.worktrees/pr88-v4-hardening/` on `feature/runway-pr88-v4-hardening` — holds emergency raw-drizzle scripts + commit `fe228da` (hotsheet-cleanup-2026-04-22 script). Everything unique here will cherry-pick into retainer-v4-cleanup; branch retires post-merge.
- `feature/runway-retainer-v4-cleanup` branch exists locally but not currently checked out in a worktree.

## Prod Runway DB access
- Env var names (set in `.env.local` in the worktree):
  - `RUNWAY_DATABASE_URL` → `libsql://runway-jasonburks.aws-us-east-1.turso.io` (per snapshot source line)
  - `RUNWAY_AUTH_TOKEN`
  - `RUNWAY_MCP_API_KEY`
- Jason has free-tier Turso hosting this DB. Tim does not need env vars to push migrations — Jason runs `pnpm runway:push` direct to Turso.
- **Never print these env var values.**

## Scripts / commands I've used
```bash
# From the worktree root
pnpm runway:pull                    # → data/runway-snapshot.json (6 tables, skips view_preferences)
npx tsx docs/tmp/data-integrity-audit/audit.ts
npx tsx docs/tmp/data-integrity-audit/detailed.ts
npx tsx docs/tmp/data-integrity-audit/retainers.ts
```

All three scratch scripts are read-only. They use the shared `createRunwayDb()` helper from `scripts/lib/run-script.ts` which auto-loads `.env.local`.

## DB client pattern (for write scripts, when we get there)
```ts
import { createRunwayDb } from "../../../scripts/lib/run-script";
const { db } = createRunwayDb();
// db is a raw drizzle client (not schema-typed)
```

For schema-typed access in the app itself: `src/lib/db/runway.ts` exports `runwayDb` (a Proxy).

## Existing migration script patterns
`scripts/runway-migrations/*.ts` — 30+ scripts. Pattern: every touch-up has a `-REVERT.ts` pair. Good pattern for any future Convergix clean-up.

Batch-hygiene requirements (per memory `feedback_mcp_batch_hygiene.md`):
- Always use `setBatchMode()` to group writes under a single `batch_id`
- Batch IDs must be unique per session
- `updated_by` must be unique per retry so audit idempotency isn't poisoned

## Branch / git context
- Main repo `main` is clean; untracked: `.claude/skills/preflight/`, `.mcp.json`, `docs/tmp/`, `runway-local.db`.
- runway-v3-cascade working tree is clean (as of session start).
- `upstream/runway` is the base branch for all Runway work. PR 88 was merged to it on 2026-04-21.
