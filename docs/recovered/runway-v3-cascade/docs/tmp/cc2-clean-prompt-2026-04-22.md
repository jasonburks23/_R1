# CC #2 — retainer-v4-cleanup (authoritative prompt, 2026-04-22)

This prompt replaces any prior instructions and incorporates all TP review feedback + operator decisions.

## Context

Post-PR-88. Two workstreams ship serial (one worktree, operator-approved):
1. CC #1 (feature/runway-flags-consolidation) — read-path. Ships FIRST.
2. YOU (feature/runway-retainer-v4-cleanup) — write-path CODE. Ships SECOND, after CC #1 merges.

Track 3 (34-op hotsheet cleanup) applied to prod cleanly 2026-04-22. Board accurate.

Tonight's retainer migration shipped to prod 2026-04-21 with 91 writes across 35 ops on 7 clients. 7 commits on this branch are unpushed (d15be88 → 5575d07).

PR 88 prod schema: `target` dropped, `parent_project_id` added via raw SQL bypass. App live at 200 OK.

CC #1 ships and merges before you fire. Your rebase target at execution time is latest `upstream/runway` (which will include CC #1's merge).

## Your role

- Executor. Completion-driven.
- TP has critically reviewed your plan. Feedback below is authoritative.
- Operator holds final approval at every gate (plan mode, post-code review pipeline, PR).
- No code until operator approves the ExitPlanMode handoff.

## STEP 0: Worktree setup

Worktree: `/Users/jasonburks/Documents/_AI_/_R1/.worktrees/runway-v3-cascade`

By the time you fire, CC #1 has shipped and merged. Verify state:

```bash
cd /Users/jasonburks/Documents/_AI_/_R1/.worktrees/runway-v3-cascade
git status                                             # expect clean
git fetch origin
git checkout feature/runway-retainer-v4-cleanup        # 7 retainer commits still on branch pointer
git log --oneline -8                                   # verify d15be88 → 5575d07 intact
```

If the 7 commits are not visible on HEAD, stop and report.

## STEP 1: Enter plan mode (permission gate, NOT a document)

Plan mode = Claude Code's `/plan` slash command + `ExitPlanMode` tool. A markdown file in `docs/tmp/` is a RECORD for TP continuity, NOT the permission mechanism.

1. Invoke `/plan`.
2. Read this prompt plus TP's authoritative feedback below.
3. Do your research: git log inspection, read the MCP tools file, rebase dry-run, etc.
4. Produce a revised plan.
5. Call `ExitPlanMode` with the plan summary.
6. Wait for operator approval.
7. Only after operator greenlight, exit plan mode and execute.
8. After PR ships, mirror your plan to `docs/tmp/cc2-retainer-v4-cleanup-plan.md` as TP record.

## TP review feedback — AUTHORITATIVE

**MIGRATION SCAFFOLDS REMOVED (commit 11 CUT).** Per operator directive: no migration scripts by these CCs. Both the scheduled-status backfill scaffold and Convergix wrapper scaffold are removed entirely from scope. Operator drives any future data writes outside CC sessions via MCP. Your PR ships 13 commits total (7 rebased + 6 new), NOT 14.

**MCP PATH CORRECTION.** MCP tool definitions live at `src/lib/mcp/runway-tools.ts`, NOT `src/app/api/mcp/runway/**`. The `api/mcp/runway/route.ts` is just the HTTP transport wrapper. Owned surfaces updated below.

**EXISTS(children) guard predicate.** Use the EXISTS subquery form, not `parent_project_id IS NULL`. Semantic: "this retainer L1 has L1 children pointing at it" = wrapper.

```ts
project.engagementType === "retainer"
AND EXISTS (SELECT 1 FROM projects WHERE parent_project_id = project.id)
```

**Orphan validator KEPT.** It's a read-only diagnostic, not a migration. Lives at `scripts/runway-migrations/check-orphan-parent-project-ids.ts` with package.json script `runway:check-orphans`. Operator invokes manually post-merge.

**Scratch file cleanup: DELETE ALL 9.** `query-data.ts`, `docs/tmp/lppc-check.ts`, `scripts/query-in-flight-gaps.ts`, `data_integrity.ts`, `deep_flags_check.ts`, `query.ts`, `schema_check.ts`, `schema_detail.ts`, `validate.ts`.

**Test strategy: test-db.ts pattern MANDATORY.** Verified: `operations-reads-health.test.ts` uses `vi.mock("@/lib/db/runway", () => ({ getRunwayDb: () => testDb }))` + `createTestDb`/`cleanupTestDb` per test. Local SQLite, no prod contact. Your recompute guard tests and MCP tool tests MUST follow this pattern. If an assertion genuinely requires a prod-Turso write, flag it to TP per-test before adding. Zero prod DB writes from test infrastructure.

**engagementType enum values: verify against prod first.** Before writing the MCP expansion commits, run:

```bash
set -a && source .env.local && set +a
# Via tsx or your preferred MCP read path:
# SELECT DISTINCT engagement_type FROM projects;
```

Use ONLY the values that actually exist. Default guess: `["project", "retainer", "break-fix"]`. If prod has fewer or different values, constrain the Zod enum. Report findings in your plan.

**Rebase-first ordering.** Task 1 (rebase) runs FIRST. Task numbering in earlier drafts was topical, not temporal. Correct sequence: rebase → hygiene → cherry-pick → recompute guard → MCP expansion → schema-drift gate.

**CONVERGIX_L1_NAMES question moot.** No scaffold = no constant-reuse question. Drop from plan.

**Branch names > PR numbers.** Anchor on `feature/runway-retainer-v4-cleanup`. Real PR number assigned at `gh pr create` time.

## Owned file surfaces

- `scripts/runway-migrations/**` (scripts + backups/ + README.md)
- `src/lib/runway/operations-writes-project.ts`
- `src/lib/runway/operations-writes-week.ts`
- `src/lib/runway/operations-utils.ts`
- `src/lib/runway/mutation-response.ts`
- `src/lib/mcp/runway-tools.ts` (MCP tool definitions)
- `src/app/api/mcp/runway/route.ts` + `route.test.ts` (only if transport layer needs touching; unlikely)
- `package.json` (one script entry: `runway:check-orphans`)
- Co-located `*.test.ts` files

## Do NOT touch (CC #1 owns)

- `src/lib/runway/flags*.ts`
- `src/lib/runway/plate-summary.*`
- `src/lib/runway/operations-reads-*` (stale_days fix is CC #1's)
- `src/app/runway/components/flags-panel.tsx`
- `src/app/runway/components/plate-summary.tsx` (deleted by CC #1)
- `src/app/runway/page.tsx`
- `src/app/runway/runway-board.tsx`
- `src/app/runway/unified-view.ts`
- `src/app/runway/types.ts`

## Tasks

### Task 1 (FIRST): Rebase onto upstream/runway

```bash
git fetch origin
git rebase upstream/runway --no-commit
```

Report ACTUAL conflict count before proceeding. Expected 2:

**Conflict A** in `src/lib/runway/operations-writes-project.ts` effectiveNewValue block:
- Retainer (d15be88) widened signature `newValue: string | null`
- PR 88 (02dfba8) added parentProjectId column handling + `""` → null coercion
- Resolution: keep PR 88's parentProjectId coercion intact, layer retainer's string | null handling on top. Both commute.

**Conflict B** in `src/lib/runway/operations-writes-project.test.ts` mock PROJECT_FIELDS:
- Retainer added null-write mocks
- PR 88 (4cdf269) dropped `"target"`
- Resolution: drop `"target"`, keep retainer's additions (engagementType, contractStart, contractEnd)

**No Conflict C expected:** validateFieldNames lives inside the migration file, NOT in operations-utils.ts (verified). But verify during dry-run.

If conflict count ≠ 2, stop and report to TP.

Do NOT amend the 7 retainer commits during rebase.

### Task 2: PR 88 hygiene + orphan validator (commit 8)

**Cherry-pick files from** `/Users/jasonburks/Documents/_AI_/_R1/.worktrees/pr88-v4-hardening/`:
- `scripts/runway-migrations/precheck-target-backup.ts` → same path here
- `scripts/runway-migrations/apply-target-to-notes-raw.ts` → same path here
- `scripts/runway-migrations/apply-pr88-schema-raw.ts` → same path here
- `docs/tmp/target-backup-2026-04-21.json` → `scripts/runway-migrations/backups/target-backup-2026-04-21.json`

Confirm each is ≤100 lines of logic before copying. If any is unfamiliar or >200 lines, stop and ask TP.

**Delete 9 scratch files:**
- `query-data.ts` (worktree root)
- `docs/tmp/lppc-check.ts`
- `scripts/query-in-flight-gaps.ts`
- `data_integrity.ts` (worktree root)
- `deep_flags_check.ts` (worktree root)
- `query.ts` (worktree root)
- `schema_check.ts` (worktree root)
- `schema_detail.ts` (worktree root)
- `validate.ts` (worktree root)

**Skip:** `scripts/runway-migrations/2026-04-21-migrate-target-to-notes.ts` — not present, no-op.

**Write** `scripts/runway-migrations/check-orphan-parent-project-ids.ts`:
- libsql client setup copied from `precheck-target-backup.ts` pattern
- Query:
  ```sql
  SELECT p.id, p.name, p.parent_project_id
  FROM projects p
  LEFT JOIN projects pp ON pp.id = p.parent_project_id
  WHERE p.parent_project_id IS NOT NULL AND pp.id IS NULL
  ```
- Exit 0 clean, 1 if orphans; print row list.

**Add to package.json:**
```json
"runway:check-orphans": "tsx scripts/runway-migrations/check-orphan-parent-project-ids.ts"
```

**Add to scripts/runway-migrations/README.md** (create if absent):
> Run `pnpm runway:check-orphans` after any operation that touches `parent_project_id`.

Explicit `git add <file>` per file. Never `git add -A`.

Commit 8: `chore(runway): PR 88 hygiene + orphan validator`

### Task 3: Cherry-pick fe228da (commit 9)

```bash
git cherry-pick fe228da
```

Brings `scripts/runway-migrations/hotsheet-cleanup-2026-04-22.ts` into the branch as historical record of Track 3. Script already ran to prod; cherry-pick is git-recording only.

Verified fe228da is a standalone new-file add (879 lines, 0 deletions); no dependencies on intermediate `pr88-v4-hardening` commits. Should apply cleanly.

**Gate:**
```bash
pnpm tsc --noEmit scripts/runway-migrations/hotsheet-cleanup-2026-04-22.ts
```

Confirms imports resolve against post-rebase tree. If fails, stop and report.

If cherry-pick conflicts (unexpected), stop and report before resolving.

Commit 9: (cherry-picked fe228da) `chore: hotsheet-cleanup-2026-04-22 data correction script`

### Task 4: Retainer-aware recompute guard (commit 10)

Location: top of `recomputeProjectDatesWith` in `src/lib/runway/operations-writes-week.ts` (~line 68). Single chokepoint guards all 4 call sites (createWeekItem, updateWeekItemField, deleteWeekItem, linkWeekItemToProject).

Shape:
```ts
export async function recomputeProjectDatesWith(
  executor: RecomputeExecutor,
  projectId: string,
): Promise<{ startDate: string | null; endDate: string | null }> {
  // Retainer-wrapper guard: freeze L1s that have L1 children pointing at them.
  const projRow = await executor
    .select({
      engagementType: projects.engagementType,
      startDate: projects.startDate,
      endDate: projects.endDate,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const proj = projRow[0];
  if (proj?.engagementType === "retainer") {
    const childCountRow = await executor
      .select({ c: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.parentProjectId, projectId));
    if (Number(childCountRow[0]?.c ?? 0) > 0) {
      return { startDate: proj.startDate, endDate: proj.endDate };
    }
  }
  // ... existing MIN/MAX logic unchanged
}
```

**Tests (test-db.ts pattern, add to operations-writes-week.test.ts):**
1. Retainer L1, 0 children, L2 write → recompute fires
2. Retainer wrapper (1+ children) + L2 write → wrapper dates unchanged
3. Non-retainer L1 + L2 write → recompute fires as before
4. L2 write on child-of-wrapper L1 → child recomputes; wrapper untouched
5. Retainer L1 with 0 children but parent_project_id set (a child of a wrapper itself) + L2 write → recompute fires (only wrapper freezes)

Commit 10: `feat(runway): retainer-aware recompute guard (EXISTS L1 children)`

### Task 5: MCP surface expansion (commits 11-13)

**BEFORE writing commit 11,** verify engagementType enum values against prod:
```bash
set -a && source .env.local && set +a
# Read prod: SELECT DISTINCT engagement_type FROM projects
```

Report findings in plan. Use actual prod values in the Zod enum.

All edits live in `src/lib/mcp/runway-tools.ts` + `operations-writes-*.ts` + `operations-utils.ts` as needed.

#### Commit 11: `feat(runway): MCP update_project_field + update_project_status hardening`

`update_project_field` field enum:

**2026-04-24 amendment (TP verification after holistic review):**
- `"target"` was already removed from the enum AND from `PROJECT_FIELDS` by PR 88. No action.
- `"parentProjectId"` is ALREADY in the MCP enum at `runway-tools.ts:429` (PR 88 Chunk F). Do NOT re-add to the enum. The MISSING work is the **backend validators** in `operations-writes-project.ts` — they don't exist today (zero grep hits for "cycle", "same client", "engagementType retainer check" in that file).
- `PROJECT_FIELDS` in `operations-utils.ts:323-333` ALREADY includes `engagementType`, `contractStart`, `contractEnd`, `parentProjectId` (PR 88). No whitelist edit needed.
- This commit's real work: MCP enum additions (engagementType, contractStart, contractEnd only), Zod date validators, contract date invariants, AND backend validators for parentProjectId.

Enum additions (NEW to MCP `field` enum):
- ADD `"engagementType"` (Zod enum per prod verification: `"retainer" | "project" | null`)
- ADD `"contractStart"` (real ISO parse + roundtrip: `const d = new Date(val); d.toISOString().slice(0,10) === val`. Shape-only regex insufficient — accepts `"2026-13-45"`.)
- ADD `"contractEnd"` (same real ISO parse + roundtrip)
- If BOTH `contractStart` and `contractEnd` are provided on the same call, enforce `contractStart < contractEnd` at tool boundary.

Backend validators for existing `parentProjectId` enum entry (add in `operations-writes-project.ts`):
- Parent project must exist → else reject
- Parent `engagementType` must equal `"retainer"` → else reject
- Parent and child must share the same `client_id` → else reject
- No cycle via 10-hop walk (A → B → A, or deeper) → else reject
- All rejections via `RunwayWriteResult` error path, not thrown

`update_project_status`:
- Harden `newStatus` to Zod enum: `["in-production", "awaiting-client", "not-started", "blocked", "on-hold", "completed", "canceled"]`

Tests (test-db.ts):
- Invalid engagementType → Zod reject
- Invalid ISO date format → Zod reject
- parentProjectId non-existent → helper reject
- parentProjectId non-retainer parent → reject
- parentProjectId cycle → reject
- update_project_status invalid enum → reject
- parentProjectId with parent in a different `client_id` → reject (same-client check)
- contractStart = `"2026-13-45"` (shape-valid, date-invalid) → reject (real ISO parse + roundtrip)
- contractStart = `"2026-07-01"` with contractEnd = `"2026-06-01"` (end < start) → reject

#### Commit 12: `feat(runway): MCP add_project + week_item expansion`

`add_project` input: ADD optional resources, waitingOn, engagementType, contractStart, contractEnd, startDate (ISO), endDate (ISO), parentProjectId.

`update_week_item` field enum: ADD `"startDate"`, `"endDate"`, `"blockedBy"`.
`update_week_item` status: Zod enum `["scheduled", "in-progress", "blocked", "at-risk", "completed", "canceled"]`.nullable().
`update_week_item` category: Zod enum `["delivery", "review", "kickoff", "deadline", "approval", "launch"]`.

`create_week_item` input: ADD optional startDate, endDate, blockedBy.

Tests (test-db.ts):
- add_project with engagementType + contract dates → succeeds, audit row written
- update_week_item status with invalid string → reject
- update_week_item field="startDate" with valid ISO → succeeds, triggers parent recompute (guard if wrapper)
- create_week_item with blockedBy array → succeeds

#### Commit 13: `feat(runway): MCP override_project_date + set_project_parent + batch_apply`

Three new tools:

**`override_project_date({ clientSlug, projectName, field: "startDate"|"endDate", newValue: string|null, updatedBy, bypassGuard?: boolean })`**
- Raw-drizzles past PROJECT_FIELDS whitelist (pattern from commit 78eb5c1)
- Writes audit row with `update_type = "date-override"` **AND includes both `oldValue` and `newValue` in the audit row** (supports clean reverts)
- Idempotency key composed from `(projectId, field, oldValue, newValue)` — NOT just `newValue`. Per `feedback_revert_idempotency_poisoning`: revert + retry on same target value poisons if the key doesn't include `oldValue`. Including `oldValue` makes each revert produce a distinct key.
- On wrapper L1: require `bypassGuard=true` or reject with clear error

**`set_project_parent({ clientSlug, projectName, parentProjectName: string|null, updatedBy })`**
- `parentProjectName=null` clears parent_project_id
- Non-null validates: parent exists; parent engagementType="retainer"; **parent and child share same `client_id`**; no cycle
- Routes through updateProjectField (parentProjectId whitelisted in commit 11)

**`batch_apply({ batchId, updatedBy, ops: Array<{tool: string, args: object}>, haltOnError?: boolean })`**
- `setBatchId(batchId)` at entry
- Run ops sequentially via dispatch table
- Capture per-op MutationResponse into results array
- `setBatchId(null)` in finally
- Returns `{ ok, message, data: { results: Array<...> } }`

Dispatch table includes every existing mutation tool + three new tools.

Tests (test-db.ts):
- override_project_date writes audit with update_type="date-override"
- override_project_date on wrapper without bypassGuard → reject
- override_project_date on wrapper with bypassGuard=true → succeeds
- set_project_parent cycle (A→B→A) → reject
- set_project_parent non-retainer parent → reject
- set_project_parent null → clears, audit written
- batch_apply 3 ops → 3 audit rows under same batchId, _currentBatchId cleared on return
- batch_apply haltOnError=false with middle failure → remaining ops run, results array mixed
- set_project_parent with parent in a different `client_id` than child → reject (same-client check)
- override_project_date revert (oldValue=A → newValue=B) then retry same (oldValue=A → newValue=B) after revert → two distinct audit rows, no idempotency collision (key includes oldValue)

### Task 6: Schema-drift gate

After all 13 commits staged:
```bash
pnpm runway:generate
```

Generated diff MUST be empty. Non-empty = `src/lib/db/runway-schema.ts` drifted from prod; next `pnpm runway:push` would silently revert PR 88 schema.

If non-empty, stop and report diff content to TP. Do NOT push.

## Commit list (13 total)

1-7. (rebased) d15be88 → 5575d07 unchanged
8. chore(runway): PR 88 hygiene + orphan validator
9. (cherry-picked fe228da) chore: hotsheet-cleanup-2026-04-22 data correction script
10. feat(runway): retainer-aware recompute guard (EXISTS L1 children)
11. feat(runway): MCP update_project_field + update_project_status hardening
12. feat(runway): MCP add_project + week_item expansion
13. feat(runway): MCP override_project_date + set_project_parent + batch_apply

Explicit `git add <file>` per file. Never `git add -A`.

## Gates (run in order)

1. `pnpm lint` on touched files — clean
2. `pnpm tsc --noEmit` — no new errors vs baseline (JobsDataTable.tsx, bot-tools.test.ts, proxy.test.ts, member-utils.test.ts, list-utils.test.ts)
3. `pnpm build` — up to baseline
4. `set -a && source .env.local && set +a && pnpm test:run scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.test.ts` — 12/12 DRY_RUN pass (regression guard)
5. `pnpm test:run src/lib/runway/operations-writes-*.test.ts src/lib/runway/operations-utils.test.ts` — all pass including new recompute guard tests (test-db.ts pattern)
6. MCP tool tests — pass including new enums + new tools (test-db.ts pattern)
7. `pnpm runway:generate` — EMPTY diff (schema-drift gate)
8. `git log --oneline upstream/runway..HEAD | wc -l` → 13

## POST-CODE review pipeline (after Task 6 complete, gates green)

Execute in exact order:

1. Run `/preflight` on full tree
2. Read code-review skill file (locate: `.claude/commands/code-review.md` or grep `.claude/skills/code-review/`). Follow every step manually. Fix issues.
3. Run `/preflight` again
4. Read pr-ready skill file. Follow every step manually. Fix issues.
5. Run `/atomic-commits` (splits any uncommitted tree; likely no-op since Task commits are explicit)

Do not skip or reorder.

## Push + open PR

```bash
git push -u origin feature/runway-retainer-v4-cleanup
gh pr create --base runway --title "Retainer v4 cleanup + PR 88 hygiene + MCP surface expansion" --body "$(cat <<'EOF'
## Summary
- Retainer-v4-cleanup migration shipped to prod 2026-04-21 (35 ops, 7 clients, 91 writes). This PR brings the 7 commits upstream.
- PR 88 hygiene: emergency scripts archived, orphan validator added (`pnpm runway:check-orphans`).
- Cherry-picked hotsheet-cleanup-2026-04-22.ts (Track 3, 34 ops applied 2026-04-22) as historical record.
- Retainer-aware recompute guard: wrappers (retainer L1s with L1 children) freeze at SOW contract dates; children recompute from L2 widths.
- MCP surface expansion: engagementType, contractStart/End, parentProjectId now writable via MCP. New tools: override_project_date, set_project_parent, batch_apply. Zod enum hardening across status/category.

## Why
Tonight's migration cycle surfaced three write-layer gaps (field-whitelist collision on derived fields, raw-drizzle pattern needed for L1 dates, idempotency poisoning on retry). MCP expansion + recompute guard close those gaps so future data work skips raw-SQL.

## Deployment notes
- Merge AFTER feature/runway-flags-consolidation lands (Week-view wrapper filter must be live before any Convergix wrapper gets created post-merge).
- Operator runs `pnpm runway:check-orphans` post-merge as smoke test.
- No migration runs in this PR. Future data work (Convergix wrapper creation, scheduled-status backfill) drives separately via MCP direct.

## Root causes addressed
- DRY_RUN short-circuits before helper validation (feedback_dryrun_vs_apply_gap memory)
- Revert audit rows poison idempotency retry keys (feedback_revert_idempotency_poisoning)
- PROJECT_FIELDS whitelist excludes derived fields; MCP couldn't write L1 dates (now: override_project_date helper)

## Verification
- [ ] pnpm test:run green
- [ ] pnpm tsc --noEmit at baseline
- [ ] pnpm build at baseline
- [ ] preflight + code-review + pr-ready clean
- [ ] pnpm runway:generate empty diff
- [ ] Manual: pnpm runway:check-orphans exits 0 against current prod
EOF
)"
```

## POST-PR: Llama sweep

After `gh pr create` returns the URL:

1. Wait 20 minutes (Llama review runs async)
2. Check PR for Llama comments:
   ```bash
   gh pr view <url> --comments
   gh api repos/<owner>/<repo>/pulls/<N>/comments
   ```
3. If Llama flagged issues: address with new commits on the same branch, push.
4. If Llama clean: report clean to TP.

Do NOT merge. Operator merges.

## Report back to TP

- All 13 commit hashes
- Gate 1-8 results + baseline flags
- Rebase: actual conflict count + resolution notes
- engagementType enum values found in prod
- fe228da cherry-pick tsc check result
- /preflight results (both runs)
- code-review findings + fixes
- pr-ready findings + fixes
- Schema-drift gate: empty diff confirmed
- MCP expansion test counts per commit
- PR URL
- Llama sweep result (clean or addressed)

## Do NOT

- Write code before ExitPlanMode + operator approval
- Run any migration (scaffolds are CUT; operator drives data writes outside CCs)
- Touch CC #1's owned file surfaces
- Use `git add -A`
- Amend the 7 retainer commits during rebase
- Write any test that hits prod Turso (test-db.ts pattern mandatory)
- Run `runway:push`; `runway:generate` is read-only compare
- Merge the PR (operator does)
- Skip any step in the post-code pipeline

## DO NOT REPEAT (post-compaction recovery)

If you compact mid-task:
1. `git log upstream/runway..HEAD` — what's landed
2. `git status` — uncommitted work
3. Read `docs/tmp/cc2-retainer-v4-cleanup-plan.md` — plan record (if mirrored)
4. Only replan the next unshipped task. Do not re-derive completed work.
