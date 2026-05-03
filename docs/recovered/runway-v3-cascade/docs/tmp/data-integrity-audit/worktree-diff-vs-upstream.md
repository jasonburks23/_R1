# Worktree diff vs upstream/runway — 2026-04-23

Snapshot of branch state relative to `upstream/runway` (Tim's canonical branch). Captured before CC #1 / CC #2 plan review.

## Branch tips

| Branch | Tip | Status |
|---|---|---|
| `upstream/runway` | `219819c` | Tim's latest. PR 88 merged. |
| `feature/runway-flags-consolidation` (CC #1's expected home) | `219819c` | **Identical to upstream/runway. Zero new commits.** CC #1 hasn't committed anything yet. |
| `feature/runway-retainer-v4-cleanup` (prior migration, shipped) | 7 commits ahead of `upstream/runway` | Branch has real work. Migration already applied to prod per `project_retainer_v4_cleanup_shipped.md` memory. |
| `main` | `e219194` | 28+ commits behind `upstream/runway`. |
| `feature/data-integrity-skill` (this session) | 1 commit ahead of main | `/data-integrity` skill. Not yet merged. |

## CC #1 (`feature/runway-flags-consolidation`)

**Empty branch.** Literally the same commit as `upstream/runway`. No code yet.

**Implication:** When the operator or primary TP hands me CC #1's plan, it's a proposal for what CC #1 will build, not code to review. My job will be evaluating the proposal at the planning stage, not diffing existing code.

**Specifically confirms:** the previously-assumed "Week-view wrapper filter" on CC #1 DOES NOT EXIST. If that filter is part of CC #1's plan, it's something to be built. If it's NOT in CC #1's plan, we have a gap (wrappers will ghost in Week view when the wrapper-migration data writes land).

## CC #2 (naming TBD — likely new branch, not `feature/runway-retainer-v4-cleanup`)

The existing `feature/runway-retainer-v4-cleanup` branch shipped its migration on 2026-04-21 per memory. Seven commits, file changes include:

```
feat(runway): retainer v4 cleanup migration - 35 changes across 7 clients
feat(runway): pre-writes field-name validator for retainer v4 cleanup
fix(runway): route L1 endDate/startDate writes through raw-drizzle
fix(runway): refresh idempotency seed for retainer-v4-cleanup retry
fix(runway): raise trust-preservation threshold to 22:00Z post-revert
feat(runway): support null-field writes in operations-writes helpers
```

**Scope signals:** pre-writes field-name validator (aligns with batch-hygiene rails), raw-drizzle L1 date writes (concerning — violates "never direct-write L1 startDate/endDate" unless there's a defensible reason for the specific retainer-v4 case), null-field write support (new operations helper capability).

**Status:** SHIPPED already per memory. If the "CC #2" the operator refers to is a continuation or new branch, expect it to pick up where this left off (retainer-aware recompute guards, EXISTS-subquery predicate, etc. per `pending-decisions.md`). Wait for operator to name the actual CC #2 branch when they share its plan.

## Upstream/runway delta vs main

`main` is ~28 commits behind `upstream/runway`. This is expected — `main` is the stable trunk, `upstream/runway` is Tim's active work. PRs 86, 87, 88 are merged on runway but not on main.

Notable shipped features on `upstream/runway` not yet on `main`:
- `parent_project_id` wrapper column (PR 88 / commit `02dfba8`)
- `status/clientSlug/engagementType` filters on MCP tools (`752ec84`)
- `scheduled` as first-class L2 status (`29df9f0`)
- `get_rows_changed_since` MCP drift-detection tool (`94cf383`)
- `target` column removal + target-to-notes migration (`4cdf269`, `ad3bff2`)

All of these are relevant background for CC plan reviews.

## Takeaways for CC plan review

1. **CC #1 is at zero.** Evaluating its plan means evaluating a proposal, not code.
2. **If CC #1's plan doesn't include the Week-view wrapper filter**, flag it — wrapper migration needs that filter to land first or wrappers ghost the Week view.
3. **CC #2's exact branch TBD.** The `feature/runway-retainer-v4-cleanup` branch is prior work. The actual CC #2 may be a new branch the operator will name.
4. **Data writes already done by data-integrity TP** that CC #2 may have had scoped:
   - Convergix Kathy-cleanup (101 audit rows, 2026-04-22) — structural + status changes + new Tasks
   - Timestamp correction (38 audit rows, 2026-04-22) — ms → seconds fix
   - Prior: `retainer-v4-cleanup-2026-04-21` 35 changes across 7 clients (already shipped on `feature/runway-retainer-v4-cleanup`)
   - Prior: `hotsheet-cleanup-2026-04-22` 34 writes
   - Prior: `target-to-notes-raw-2026-04-21` 4 writes
   - If CC #2's plan double-scopes any of these, flag it as "already applied — remove from CC #2 scope."
5. **Operator directive 2026-04-23:** "all data writes go through data-integrity TP, not outside migration scripts." When reviewing CC plans, redirect any proposed data-write migrations to me, with justification only for small in-code defensible exceptions.
