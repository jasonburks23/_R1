# CC #2 review — data-integrity thought-partner

**Date:** 2026-04-23
**Plan reviewed:** CC #2 initial plan "Retainer v4 cleanup + PR 88 hygiene + MCP surface expansion" (has not yet received TP round-2 feedback — I'm reviewing the raw initial plan)
**Branch:** `feature/runway-retainer-v4-cleanup` (7 commits ahead of `upstream/runway`, all applied to prod already on 2026-04-21)
**Reviewer role:** Data-integrity TP. Per operator directive 2026-04-23, all prod data writes go through me. CCs author code (writes-layer helpers, MCP tools, validators, recompute logic). CCs do not author data-write migration scripts.

---

## Headline verdict

**Approved in parts. One hard redirect. Several tightening asks.**

- **Task 3 (migration scaffolds) comes out entirely.** CC #2 proposes to author both the scheduled-status backfill script AND the Convergix retainer wrapper script, framed as "not applied, operator runs post-merge." This directly violates the 2026-04-23 directive (`feedback_no_migrations_by_cc.md`): CCs don't author data-write scripts of any kind, even if someone else runs them. Both migrations are in my queue. I'll write them in `docs/tmp/data-integrity-audit/` under the `/data-integrity` skill rails, with the writes-layer helpers + MCP tooling CC #2 is building here as infrastructure.
- **Tasks 5, 1, 1-b, 2, 4, 6 stay in scope** with concerns noted below. These are all code (rebase, archival scripts, writes-layer helper, MCP tool surface, schema-drift gate, orphan validator). All appropriate for CC.
- CC #2 surfaced real research (MCP path correction, PROJECT_FIELDS whitelist inspection, rebase conflict prediction, recompute chokepoint confirmation) — solid grounding. The Task 3 problem is scope, not execution.

---

## Per-task assessment

### Task 5 — Rebase onto upstream/runway (code-only, OK with guardrails)

**Scope:** Rebase 7 commits `d15be88 → 5575d07` onto `upstream/runway` at `219819c`. Expected 2 conflicts:
1. `operations-writes-project.ts` — widened `newValue: string | null` signature + PR 88's `parentProjectId` coercion. Merge both.
2. `operations-writes-project.test.ts` — dropped "target" from mock fields + retainer's null-write mocks. Apply both.

**Data-integrity relevance:** The 7 commits are **already applied to prod** (per `project_retainer_v4_cleanup_shipped.md`). The rebase is git-history cleanup; NO data re-application. Safe as long as conflict resolution preserves applied-to-prod semantics exactly.

**Concern:** If CC's conflict resolution drops or re-orders write logic, code drifts from prod. Gate 4 (`retainer-v4-cleanup-2026-04-21.test.ts` 12/12 pass against prod Turso) catches this. Keep that gate strict. If ≠12/12 post-rebase, stop.

**Flag:** CC's "action if conflict count ≠ 2: stop and report to TP" is correct. Do NOT silently resolve surprise conflicts — any third conflict is a signal the upstream diff has grown unexpectedly and needs a look.

### Task 1 — PR 88 hygiene + orphan validator (commit 8)

**Scope:** Copy 4 archival scripts from `pr88-v4-hardening` worktree (pre-check-target-backup, apply-target-to-notes-raw, apply-pr88-schema-raw, target-backup JSON). Delete 8+ untracked scratch `.ts` files at worktree root. Write `check-orphan-parent-project-ids.ts` read-only validator. Add `runway:check-orphans` script + README one-liner.

**Data-integrity relevance:**
- Archival scripts already ran against prod on 2026-04-21. Landing them in the repo is historical record only. Safe as long as they don't auto-run — and they won't (under `scripts/runway-migrations/`, manual invoke only).
- **The orphan validator is explicitly allowed** per `feedback_no_migrations_by_cc.md`: "Read-only diagnostic scripts (orphan validators, state checkers) can live in `scripts/runway-migrations/` and ship via CC PRs, because they don't mutate." ✓
- **README.md addition should include a DO-NOT-RE-RUN note** for the three archival scripts: "These scripts already applied to prod on 2026-04-21 under PR 88. They are archival. DO NOT re-run."

**Concerns:**

1. **Scratch-file cleanup scope.** CC lists 8 files to delete at worktree root (query-data.ts, data_integrity.ts, deep_flags_check.ts, query.ts, schema_check.ts, schema_detail.ts, validate.ts, scripts/query-in-flight-gaps.ts) plus `docs/tmp/lppc-check.ts`. **Operator must confirm the list.** Some of those names (data_integrity.ts, deep_flags_check.ts) sound like debug scratch from past TP sessions — may be mine, may be the primary TP's. Confirm before delete.
2. **Guardrail:** CC #2 MUST NOT touch anything under `docs/tmp/data-integrity-audit/`. That's my workspace. The scratch cleanup is at worktree root + `docs/tmp/` flat level only.

### Task 1-b — Cherry-pick fe228da (commit 9)

**Scope:** Cherry-pick the 879-line `hotsheet-cleanup-2026-04-22.ts` script from `feature/runway-pr88-v4-hardening`. Single-file add, 0 deletions, already applied to prod.

**Data-integrity relevance:** Archival cherry-pick. Already applied (34 writes under batch `hotsheet-cleanup-2026-04-22` per audit log). Same DO-NOT-RE-RUN note should apply.

**Concern:** CC proposes running `pnpm tsc --noEmit scripts/runway-migrations/hotsheet-cleanup-2026-04-22.ts` alone to verify imports resolve. Single-file tsc can give false-positive "pass" if cross-file references aren't fully checked. Use the project-wide `pnpm tsc --noEmit` from Gate 2 as the authoritative check, not single-file.

### Task 2 — Retainer-aware recompute guard (commit 10)

**Scope:** Add guard at top of `recomputeProjectDatesWith(executor, projectId)` in `operations-writes-week.ts`. If the project is `engagementType='retainer'` AND has ≥1 child L1 with `parentProjectId === projectId`, return existing `startDate`/`endDate` unchanged (freeze wrapper dates). Single chokepoint covers all 4 call sites (createWeekItem, updateWeekItemField, deleteWeekItem, linkWeekItemToProject).

**Data-integrity relevance:** This is a SEMANTIC CHANGE to recompute behavior. It lands in code, not data — fair for CC. But the semantics must be right or my wrapper migration breaks.

**Concerns:**

1. **Wrapper startDate/endDate at creation time — unresolved decision.** Locked metadata (2026-04-23) says: "Let `recomputeProjectDatesWith` populate startDate/endDate from children." But the guard CC is building prevents recompute on wrappers. These two decisions are **inconsistent** and must be resolved before my wrapper migration runs.
   - **My call (can be overridden):** Wrapper renders with contract dates visible. At wrapper creation, I'll set `startDate = contractStart = "2026-02-01"` and `endDate = contractEnd = "2026-07-31"` explicitly. The guard then freezes these. UI shows the wrapper as spanning the contract window. This gives operators a visual anchor for "retainer period" on the board.
   - **Alternative:** Leave startDate/endDate null, let guard freeze at null. UI degrades (wrapper has no visible timeline). Reject unless there's a render reason I'm missing.
   - **Decision:** Option 1 (set to contract dates at creation). I'll update the locked metadata note in `project_convergix_cleanup_applied.md` memory to remove the "let recompute populate" phrase — that's now stale because the guard replaces that pathway.

2. **Standalone retainers with L2s directly on them** (Dave Asprey, Hopdoddy). Retainer + 0 children → guard does NOT freeze → recompute proceeds normally. ✓ Correct.

3. **Child L1 nested under wrapper with its own L2s.** Child is retainer (inherits) but has 0 children itself → guard does NOT freeze → child's dates recompute from its own L2s. ✓ Correct. CC's test 5 covers this.

4. **Missing test:** retainer wrapper with children where an L2 is added directly on a CHILD (not the wrapper). Child recomputes; wrapper's dates must stay frozen because the recompute function was called with child's projectId, not wrapper's. CC's test 4 implies this ("L2 write on child L1 → child L1 recomputes; wrapper untouched") — keep that test explicit.

5. **Performance:** Every recompute call now issues 2 extra queries (select project + count children). L2 writes are frequent. Probably fine for our row counts. Worth noting, not blocking.

6. **No documented escape hatch.** If we ever need to refresh a wrapper's dates from elsewhere, there's no way. That's intentional for now — the override_project_date MCP tool (commit 14) with `bypassGuard=true` is the escape. Document the relationship: wrapper dates are set at create-time (via `add_project`) or forcibly overridden (via `override_project_date(bypassGuard=true)`). Never auto-recomputed.

7. **Ordering dependency surfaces:** the guard must land in prod BEFORE my wrapper migration runs, or a stray L2 write could drift wrapper dates. See "Ordering" section below.

### Task 3 — Migration scaffolds (REMOVE ENTIRELY)

**This is the hard redirect.**

CC #2 proposes two migration scripts in `scripts/runway-migrations/` committed to the branch and run post-merge by operator:

- **File A:** `2026-04-22-scheduled-status-backfill.ts` — blanket backfill of NULL-status L2s to "scheduled" with filter (start_date >= today, skip completed/cancelled parents, skip multi-day-spanning-today).
- **File B:** `2026-04-22-convergix-retainer-wrapper.ts` — creates Convergix wrapper row (above L1 in the hierarchy), nests L1 children via `CONVERGIX_L1_NAMES` imported from the sealed retainer migration file.

**Why this is a hard no:**

Per `feedback_no_migrations_by_cc.md` (operator directive 2026-04-23):
> "All prod data writes go through the data-integrity TP session. Not CCs. Not one-off operator-written scripts outside a TP session."
> 
> "TP prompts for CC explicitly exclude migration authoring/runs AND data-write scripts of any kind. CCs author code (writes-layer helpers, MCP tools, recompute logic, validators, UI). They do not author or run data-touching batches."

**Even framed as "CC writes it but operator runs it, not CC" — that's exactly the "outside-CC operator migrations" pattern the directive retired.** The data-integrity TP authors, QAs (2-pass fresh-context agents), DRY_RUNs, and APPLYs under its own batch hygiene. No middle-man scripts authored by CC and handed off.

**What's specifically wrong in CC's proposals if they did ship:**

*File A — scheduled-status backfill:*
- CC proposes **blanket backfill** of qualifying rows. My call (per `pending-decisions.md`, `project_phase1_phase2_complete.md`) is **per-row reasoning** for the 17 non-Convergix NULL L2s. Operator deferred this to Phase 3 writes so data-integrity TP owns the per-row reasoning.
- CC's filter (`start_date >= current_date`) would miss past-dated NULL rows that still matter.
- Skip-multi-day logic is thin — what about L2s spanning a completed event that should flip completed, not scheduled?

*File B — Convergix wrapper:*
- **Name wrong:** CC proposes `"Convergix Retainer 2026-02-01 - 2026-07-31"` (with dates in the name). Locked metadata is `"Convergix Retainer"` (no dates in name). Contract window lives in `contractStart`/`contractEnd`.
- **Missing metadata:** doesn't set `category: "active"`, `resources: NULL` (explicit).
- **Wrong source for CONVERGIX_L1_NAMES:** the retainer-v4-cleanup migration's constant doesn't reflect my post-Kathy-cleanup reality (13 active + 4 new monthly Social L1s + the new Assembly Campaign). Blindly reusing it risks nesting the 3 historical completions (Life Sciences Brochure, Organic Social Playbook, Social Media Templates) which operator explicitly excluded: "we are not doing legacy projects from the past, please don't build those."
- **Missing retainer-renewal Task:** locked metadata calls for a Monday 2026-05-25 Kathy-owned Task on the wrapper ("2H retainer conversation with Daniel"). CC's scaffold doesn't mention it.
- **CONVERGIX_L1_NAMES export-add:** CC proposes editing the already-sealed retainer-v4-cleanup migration file to add an export. "Pure export add, no behavior change" — fine in theory, but touching an applied migration is a pattern we want to avoid. I'll define the 17 names/IDs in my own wrapper migration script in `docs/tmp/data-integrity-audit/`, no edit to the sealed file needed.

**Resolution:** strip Task 3 entirely from CC #2's scope. Drop commit 11. Commit count 14 → 13.

CC #2 provides the *infrastructure* I need to run these migrations well:
- Recompute guard (Task 2) so my wrapper create call doesn't trigger unwanted recompute.
- MCP `parentProjectId` validation (Task 4 commit 12) so my nesting calls validate parent-exists + same-client.
- MCP `override_project_date` + `batch_apply` (Task 4 commit 14) so I can set wrapper dates + run multi-op batches without a tsx script.

I then author the actual data writes in my workspace, separately.

### Task 4 — MCP surface expansion (commits 12-14, keep with tightening)

#### Commit 12 — update_project_field + update_project_status hardening

**Data concerns:**

1. **engagementType enum values unverified.** CC proposes `z.enum(["project","retainer","break-fix"])`. Data-shape baseline shows values `retainer`, `project`, `NULL` in the wild. **"break-fix" is unverified — may be invented.** CC must grep `src/lib/db/runway-schema.ts` for the canonical engagementType enum definition and use those exact values. If the schema has no enum and it's text, default to `["project","retainer"]` and document what happens on NULL.

2. **update_project_status enum unverified.** CC proposes `["in-production","awaiting-client","not-started","blocked","on-hold","completed","canceled"]`. Grep schema. Data-shape shows in-production, awaiting-client, not-started, on-hold, completed. "blocked" and "canceled" may or may not be valid project statuses (they're week_item statuses for sure). Confirm before enum-hardening.

3. **parentProjectId validation — add same-client check.** CC's validation list: parent exists ✓, parent engagementType=retainer ✓, no cycle ≤10 hops ✓. **Missing:** parent and child must share the same `client_id`. Nesting a Convergix L1 under Dave Asprey would corrupt the retainer hierarchy. Add.

4. **contractStart/contractEnd regex too loose.** `/^\d{4}-\d{2}-\d{2}$/` accepts "2026-13-45". Use a real date-parse + roundtrip check (`const d = new Date(val); d.toISOString().slice(0,10) === val`). Optional tighter: both must be same-year or sequential, and `contractStart < contractEnd`.

5. **No data writes.** ✓

#### Commit 13 — add_project + week_item expansion

**Data concerns:**

1. **add_project with optional startDate/endDate is a direct-write path.** Per v4 convention, L1 startDate/endDate is derived, not written. Accepting these at creation time is legitimate for specific cases (retainer wrapper; project with no L2s yet needing manual dates), but it's a footgun if callers don't realize recompute will overwrite on first L2 write.
   - **Ask CC to document in the tool description:** "startDate/endDate are respected at creation. If the project later receives L2 week items, recompute overwrites these values UNLESS the project is a retainer wrapper (engagementType='retainer' with ≥1 child L1 referencing it)."
   - **Test:** add_project with startDate/endDate + 0 L2s → values preserved after a no-op recompute call. add_project with startDate/endDate + L2 added later → recompute overwrites.

2. **update_week_item status enum with `.nullable()`.** CC proposes `z.enum([...]).nullable()`. The `.nullable()` undermines the hardening. Either:
   - Drop `.nullable()` and require callers to use a specific status (forcing NULL rows to explicitly flip).
   - Keep `.nullable()` and document why: "NULL is legacy pre-backfill state, reading layer treats NULL as 'scheduled'."
   - Prefer: drop `.nullable()` since we're hardening. NULL-status L2s are being backfilled by the data-integrity TP (Phase 3 work).

3. **category enum values unverified.** CC proposes `["delivery","review","kickoff","deadline","approval","launch"]`. Data-shape distribution matches. Still grep schema to confirm.

4. **blockedBy array field — validate referenced IDs exist** (as part of the field's validation path). CC doesn't mention this.

#### Commit 14 — override_project_date + set_project_parent + batch_apply

**Data concerns:**

1. **override_project_date:** This is the break-glass tool I'll use for wrapper date-setting. Requirements:
   - Audit row MUST include both `oldValue` and `newValue` so a revert is straightforward.
   - `update_type = "date-override"` allows grep-for-these in audit. ✓ (CC proposes this.)
   - `bypassGuard=true` required on wrappers. ✓
   - **Add idempotency key that includes `oldValue` + `newValue`** (not just `newValue`). Otherwise a revert + retry pattern poisons on the same key. Per `feedback_revert_idempotency_poisoning.md`.
   - **Reject if newValue not a valid ISO date** (null is OK for clearing).

2. **set_project_parent — add same-client check** (same as Commit 12 concern).

3. **batch_apply:**
   - `setBatchId(batchId)` at entry + `setBatchId(null)` in finally. ✓
   - `haltOnError` default `true`. ✓
   - Dispatch table maps tool name → handler. **Verify:** each dispatched tool still routes through its normal helper (audit row written, idempotency enforced, validators run). No "direct" path that bypasses.
   - **Concern:** batch_apply is a powerful tool. If abused (by CC or by the operator outside my session), it lets anyone run multi-op batches. The directive still stands: code-tool availability ≠ authorization to author batches. I'll use this for my data-integrity work; operators running their own batches via this tool is out of scope and should be flagged if it happens.
   - Test: `haltOnError=false` with middle-op failure → subsequent ops still run, results array shows mixed ok. CC has this. Keep.

### Task 6 — Schema-drift gate (essential, keep)

`pnpm runway:generate` diff must be empty. Non-empty = schema drifted from prod; next push silently reverts PR 88's raw-SQL changes.

**Additional:** confirm schema has `parent_project_id` column (added PR 88), does NOT have `target` (dropped PR 88), and the `stale_days` column stays as orphan (CC #1 read-path stops reading it; dropping it is separate future work, not in either CC's scope).

---

## What to strip from CC #2

- **Task 3 entirely** (both migration scaffolds + commit 11 + the 2 package.json entries for `runway:scheduled-backfill` and `runway:convergix-wrapper`).

**New commit count: 13 (was 14).**

Revised commit list:
1-7. (rebased) `d15be88 → 5575d07` unchanged
8. chore(runway): PR 88 hygiene + orphan validator
9. feat(runway): hotsheet-cleanup cherry-pick
10. feat(runway): retainer-aware recompute guard
11. feat(runway): MCP update_project_field + update_project_status hardening *(was 12)*
12. feat(runway): MCP add_project + week_item expansion *(was 13)*
13. feat(runway): MCP override_project_date + set_project_parent + batch_apply *(was 14)*

---

## Ordering — revised after seeing CC #2's scope

CC #2 ships the recompute guard (Task 2). Wrapper migration would drift if an L2 lands directly on a wrapper before the guard is live. Revised sequence:

1. **CC #1 ships** (read-path, filter lands dormant, `get_retainer_team` + `detectWrapperCloseOut` + By Account changes land).
2. **CC #2 ships** (rebase + hygiene + recompute guard + MCP surface expansion). Guard is now live.
3. **I re-pull prod DB** (capture drift since 2026-04-22 ~22:45 UTC).
4. **I author + DRY_RUN + QA + APPLY Convergix wrapper migration** in `docs/tmp/data-integrity-audit/` using:
   - `add_project` for the wrapper (with `startDate=2026-02-01`, `endDate=2026-07-31` explicit, guard freezes them).
   - `update_project_field` with `parentProjectId` for each of the 17 active Convergix L1s.
   - `create_week_item` for the Monday 2026-05-25 retainer-renewal Task.
   - All under one `batch_id = "convergix-wrapper-migration-2026-XX-XX"`, unique `updated_by`, via `batch_apply` MCP tool OR via my own tsx script calling the helpers directly.
   - 2-pass fresh-context QA agents before APPLY per `feedback_qa_agent_for_prod_writes.md`.
   - `pnpm runway:check-orphans` post-APPLY to validate no broken parent refs.
5. **I author + DRY_RUN + QA + APPLY Phase 3 scheduled-status backfill** for the 17 non-Convergix NULL L2s with per-row reasoning (not blanket), after Kathy team replies land.

Both migrations live in MY workspace, not CC's.

---

## Questions for primary TP

1. **Scratch-file cleanup scope:** operator must confirm the 8+ untracked files CC wants to delete at worktree root. Some names suggest debug scratch from past TP sessions. Confirm list before delete. Hard guardrail: nothing under `docs/tmp/data-integrity-audit/` is touchable by CC.

2. **MCP path correction:** CC correctly caught that TP's prompt said `src/app/api/mcp/runway/**` but actual tool definitions live at `src/lib/mcp/runway-tools.ts`. Accept CC's correction and update future TP prompts.

3. **Wrapper startDate/endDate at creation — locked decision:** per the wrapper-date resolution above (Task 2 concern #1), I'm updating my own locked metadata. The wrapper will be created with explicit `startDate="2026-02-01"`, `endDate="2026-07-31"`. This supersedes the "let recompute populate" phrase in `project_convergix_cleanup_applied.md`. I'll update that memory file after CC #2 review sign-off.

4. **CONVERGIX_L1_NAMES reuse:** CC proposes editing the sealed retainer-v4-cleanup migration file to add an export. **Reject.** I'll define the 17 names/IDs in my wrapper migration script. No edit to the applied migration.

5. **Ordering sign-off:** confirm CC #1 merges first → CC #2 merges second → I run wrapper migration third. My previous ordering (wrapper between the two CCs) was wrong; the recompute guard must be in prod before wrapper lands.

---

## Proposed language for TP to feed back to CC #2

Below is what I'd like the primary TP to relay to CC #2. Operator approves / edits before it goes.

```
CC #2 — plan review feedback from data-integrity TP (round 1):

Solid research — MCP path correction, rebase conflict prediction, and
recompute chokepoint are all correct. Two big moves required, then several
tightening asks.

REMOVE from scope:

Task 3 — both migration scaffolds (2026-04-22-scheduled-status-backfill.ts
AND 2026-04-22-convergix-retainer-wrapper.ts). Per operator directive
2026-04-23, CCs do not author data-write scripts of any kind, even if not
applied by CC. All prod data writes go through the data-integrity TP. Drop
commit 11 and its two package.json script entries. New total commit count:
13 (was 14).

Task 3's intent is legitimate — the Convergix wrapper needs to be created and
the scheduled-status backfill needs to run. Data-integrity TP owns both. CC
#2's contribution here is the infrastructure (recompute guard, parentProjectId
MCP validation, override_project_date, batch_apply) that lets those migrations
run cleanly. That infrastructure stays in scope.

KEEP with tightening:

Task 5 (rebase): OK. Gate 4 (12/12 retainer test against prod Turso) must pass
post-rebase. Any third surprise conflict → stop and report.

Task 1 (PR 88 hygiene + orphan validator): OK. Before deleting the 8+ scratch
files at worktree root, operator confirms the list. HARD guardrail: nothing
under docs/tmp/data-integrity-audit/ is touchable. Add a DO-NOT-RE-RUN note
to README.md covering the three archival scripts (precheck-target-backup,
apply-target-to-notes-raw, apply-pr88-schema-raw) — "Already applied to prod
2026-04-21. Archival only."

Task 1-b (cherry-pick fe228da): OK. Use the project-wide pnpm tsc --noEmit
from Gate 2 as the authoritative import-resolution check, not single-file
tsc. Include fe228da in the DO-NOT-RE-RUN note.

Task 2 (recompute guard): OK with adjustments:
- Wrapper startDate/endDate are set at creation time by the data-integrity TP
  (contract window) and frozen thereafter. Document in a code comment on the
  guard: "Wrapper dates are set at create-time via add_project or forcibly
  overridden via override_project_date(bypassGuard=true). Never
  auto-recomputed."
- Keep test 5 (CC's additional coverage for retainer child under wrapper).
- Add an explicit test: wrapper exists (above-L1 container), L2 is added on a CHILD L1 (not the
  wrapper). Child's dates recompute from its L2; wrapper's dates stay frozen
  because recompute is called with child's projectId.

Task 4 (MCP surface expansion): KEEP, with tightening:

Commit 12 (was 12, now 11 after Task 3 removal):
- Grep src/lib/db/runway-schema.ts for the canonical engagementType enum
  before assuming ["project","retainer","break-fix"]. Use those exact values.
  If the schema is text-without-enum, default to ["project","retainer"] +
  handle NULL at the tool layer.
- Grep schema for the canonical project status enum before assuming ["in-
  production","awaiting-client","not-started","blocked","on-hold","completed",
  "canceled"]. Data-shape snapshot shows 5 in use — confirm all 7 are valid
  project statuses or narrow the enum.
- Add same-client check to parentProjectId validation: parent and child must
  share clientId. This prevents nesting a Convergix L1 under the Dave Asprey
  wrapper by mistake.
- Strengthen contractStart/contractEnd: replace shape regex with real ISO
  date-parse + roundtrip check. Optional: enforce contractStart < contractEnd.

Commit 13 (was 13, now 12):
- add_project with optional startDate/endDate: document in the tool
  description that these are respected at creation but overwritten on first
  L2 write UNLESS the project is a retainer wrapper. Add two tests: (a)
  startDate/endDate preserved with 0 L2s, (b) startDate/endDate overwritten
  when L2 added later.
- update_week_item status enum: drop .nullable() (we're hardening, NULL is
  legacy pre-backfill state being cleaned up separately).
- Grep schema for category enum, confirm all 6 values are valid.
- blockedBy array: validate referenced week_item IDs exist.

Commit 14 (was 14, now 13):
- override_project_date: audit row must include both oldValue and newValue.
  Idempotency key must be derived from (projectId, field, oldValue, newValue)
  — not just newValue — to avoid revert-retry poisoning. Reject if newValue
  is not a valid ISO date (null is OK for clearing).
- set_project_parent: add same-client check (same as commit 12).
- batch_apply: each dispatched tool routes through its normal helper path
  (no shortcut that skips audit/idempotency/validator). Test this explicitly.
  Keep haltOnError=false middle-op-failure test.

Task 6 (schema-drift gate): KEEP. Essential.

Report back to TP with:
- Revised 13-commit plan structure.
- Schema grep findings (engagementType values, project status values,
  week_item category values).
- PROJECT_FIELDS post-rebase audit (did PR 88 already drop target + add
  parentProjectId? If yes, no edit needed; if no, fold into commit 11).
- MCP path confirmation (src/lib/mcp/runway-tools.ts is the truth).
- Scratch-file delete list for operator confirmation.
- Ordering: CC #1 ships first, CC #2 second, data-integrity TP runs wrapper
  migration third (after both PRs merge and guard is live in prod).
```

---

## Open flags / risks

- **Primary TP's "data updates needed" doc still unseen.** When operator shares it, I'll cross-walk every item against `worktree-diff-vs-upstream.md` "already applied" list + locked Convergix wrapper metadata + these CC reviews. Expect many items to be struck as already-done; remainders land in my queue.
- **`batch_apply` tool is powerful.** Once live, any MCP caller can run multi-op batches under a batch_id. The 2026-04-23 directive still applies: availability ≠ authorization. If I see batches running outside my session with unknown updated_by values, flag to operator immediately.
- **Recompute guard activation timing.** Until CC #2 ships, the old behavior (recompute from L2 MIN/MAX) is live. My wrapper migration MUST wait for CC #2 merge. Not a race, just a strict gate.
- **Hopdoddy Digital Retainer sits "wrapper-shaped" (retainer, 0 children).** After CC #2 + my wrapper migration, it'll still be retainer + 0 children. Guard doesn't fire (no children) → it still recomputes normally from its own L2s. Nothing to do unless operator wants to wrap it.
