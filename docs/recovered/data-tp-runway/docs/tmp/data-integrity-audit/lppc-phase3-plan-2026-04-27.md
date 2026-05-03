# LPPC Phase 3 — Kathy-Confirmed Cleanup — 2026-04-27

**Status:** Triplet drafted to disk. Two corrections applied 2026-04-28 (fresh-eyes review): startDate time-bomb fix + raw-UPDATE concurrency re-capture. Triplet to be edited by drafter; THEN DRY_RUN.

**Batch ID:** `lppc-phase3-kathy-confirmed-2026-04-27`

**Triplet on disk:**
- `scripts/runway-migrations/lppc-phase3-kathy-confirmed-2026-04-27.ts` (primary, 604 lines)
- `scripts/runway-migrations/lppc-phase3-kathy-confirmed-verify-2026-04-27.ts` (verify, 332 lines)
- `scripts/runway-migrations/lppc-phase3-kathy-confirmed-REVERT-2026-04-27.ts` (REVERT, 651 lines)

## Scope: 10 Tasks + 1 Project endDate + 1 net-new Task

All values explicitly confirmed by Kathy via Slack to operator on 2026-04-27.

| # | Task | Action |
|---|---|---|
| 1 | Interactive Map — Dev Revisions | status null → in-progress |
| 2 | Present Revised Map | status null → in-progress; date 4/24 → 5/8; **startDate 4/24 → 5/8**; weekOf 4/20 → 5/4; notes refresh |
| 3 | Interactive Map Launch | status null → scheduled; date 4/27 → 5/11; **startDate 4/27 → 5/11**; weekOf 4/27 → 5/11; notes refresh (parallel-paths with site refresh) |
| — | **Interactive Map Project** | endDate 4/27 → 5/11 (raw UPDATE — see "Raw UPDATE concurrency note" below) |
| 4 | Pencils Down | status null → completed |
| — | **NEW Task: Final Image/Copy Swaps Due (LPPC)** | weekOf 5/4, owner Kathy, status scheduled, "Roll into Staging Feedback (5/6)" |
| 5 | LPPC Images Due | status null → completed |
| 6 | LPPC Advocacy Articles + Tags Due | status null → completed; notes refresh (CMS-direct, unverified by Kathy) |
| 7 | Staging Links Due | status null → scheduled |
| 8 | LPPC Staging Feedback Due | status null → scheduled |
| 9 | QA Phase | status null → scheduled |
| 10 | Website Launch (5/11) | status null → scheduled; notes refresh (hard deadline per Kathy) |

## Audit-row math (revised 2026-04-28)

Via `updateWeekItemField` (each call → 1 audit row):

- 10 status flips
- 2 date changes (Map Launch, Present Revised Map)
- **2 startDate changes (Map Launch, Present Revised Map)** — added 2026-04-28 to fix recompute time-bomb
- 2 weekOf changes (Map Launch, Present Revised Map)
- 4 notes refreshes (Map Launch, Present Revised Map, Advocacy Articles, Website Launch)
- Subtotal: **20** audit rows from `updateWeekItemField`

Plus:

- 1 raw drizzle UPDATE on `projects.endDate` + manual audit insert (since `endDate` not in PROJECT_FIELDS)
- 1 `createWeekItem` (Final Image/Copy Swaps Due)

**Expected total: 22 audit rows under batch_id.** Drafter to verify `createWeekItem` audit-insert behavior — if it inserts >1 row (e.g., one per non-null field), update assertion accordingly.

Post-write `up()` assertion in primary script must be updated from `expectedAuditCount = 21` → `22` (or whatever the helper-verified count is).

## Why startDate must be updated (recompute time-bomb fix, 2026-04-28)

`recomputeProjectDates` (operations-writes-week.ts:111-153) derives a project's startDate/endDate from its children's startDate/endDate, with this fallback chain:

```
const start = child.startDate ?? child.date ?? null;
const end   = child.endDate ?? start;
```

If we update only `date` on Map Launch (4/27 → 5/11) and Present Revised Map (4/24 → 5/8) and leave `startDate` at the old values (4/27, 4/24 respectively), the recompute that fires inside the next child write transaction will compute:

- Map Launch effective end = startDate (4/27) — `date` is ignored because startDate is set
- Present Revised Map effective end = startDate (4/24) — same
- Project maxEnd = max(4/24, 4/24, 4/27) = **4/27**

That recompute would then revert Map Project endDate from 5/11 (set by our raw UPDATE) back to 4/27 the moment any future child write fires (Slackbot update from Kathy, status flip on a new Task, anything).

**Fix:** include `startDate` in the field changes for Map Launch (→ 5/11) and Present Revised Map (→ 5/8). With those in place, recompute computes maxEnd = 5/11 from the children, the raw UPDATE becomes audit-only, and Map Project endDate stays at 5/11 across future writes.

## Raw UPDATE concurrency note (re-capture, 2026-04-28)

Each `updateWeekItemField` call that changes `date`, `startDate`, or `endDate` on a child row fires `recomputeProjectDatesWith` inside the same transaction. If recompute writes to the project (i.e., derived dates actually changed), `projects.updated_at` advances.

The current triplet captures `mapProjectUpdatedAt` at pre-check (BEFORE child writes) and uses that captured value in the raw UPDATE's `WHERE` clause for optimistic concurrency. After children writes fire recompute, the captured value is stale, and the raw UPDATE returns 0 rows.

**Fix in triplet:**
- After all `updateWeekItemField` calls complete, re-read `projects.updatedAt` for `INTERACTIVE_MAP_PROJECT_ID` immediately before the raw UPDATE.
- Use the freshly captured value in the raw UPDATE's `WHERE`.
- Keep the existing audit-row insert.

This re-capture is small but load-bearing — without it, APPLY fails at "Project endDate raw UPDATE FAILED."

## Source: Kathy's Slack reply 2026-04-27

```
Interactive Map:
1. Dev Revisions (4/22-4/24): in-progress? → Still in progress
2. Present Revised Map (4/24): completed? → In progress, timeline needs to be revised to coincide with site launch
3. Launch (4/27): blocked? slipped? → Because of client changes and late delivery, this should now parallel path with the site refresh launch

Website Revamp:
4. Pencils Down (4/23): completed? → Design is completed, but still swapping out images and copy
5. LPPC Images Due (4/24): completed if Bill delivered? → Bill delivered on 4/24
6. Advocacy Articles + Tags (4/24): completed if Matt delivered? → I believe completed directly in the CMS, I cannot access to see
7. Staging Links Due (5/4): scheduled → On schedule
8. Staging Feedback Due (5/6): scheduled → On schedule
9. QA Phase (5/7-5/8): scheduled → On schedule
10. Website Launch (5/11): scheduled → On schedule, cannot shift
```

## Decisions baked in

| Decision | Source |
|---|---|
| Present Revised Map → date 5/8 | Operator (Q1) — Friday before Mon 5/11 launch |
| Pencils Down → completed | Operator (Q2) — design done, swaps tracked separately |
| New Task: Final Image/Copy Swaps Due 5/4 | Operator added — covers post-pencils-down residual swap work pre-Staging Feedback (5/6) |
| Map Project endDate 4/27 → 5/11 | Implied by Map Launch date shift |

## Pre-checks (per-row optimistic concurrency)

1. All 10 Tasks exist at expected (id, projectId, weekOf, title) coords
2. Each Task's current status matches expected (mostly null)
3. Each Task's current `startDate` matches expected (Map Launch=2026-04-27, Present Revised Map=2026-04-24) — added 2026-04-28
4. Map Project exists at expected ID with current endDate=2026-04-27
5. Website Revamp Project exists at expected ID
6. No existing Task with title="Final Image/Copy Swaps Due (LPPC)" + weekOf=2026-05-04 + projectId=Website Revamp (idempotency)
7. Capture each row's `updated_at` for raw-UPDATE WHERE clauses (note: re-capture Map Project's `updated_at` AFTER children writes complete — see "Raw UPDATE concurrency note" above)

## REVERT path

- Distinct UPDATED_BY = REVERT batch_id (no idempotency-key collision)
- Status flips back to null via raw drizzle UPDATE + manual audit
- Date/**startDate**/weekOf/notes restored from pre-apply snapshot (startDate added 2026-04-28)
- Project endDate reverted to 2026-04-27 — **note:** because we now also restore startDate on the children, recompute on the children-revert will re-derive endDate=4/27 on its own; the raw UPDATE here becomes audit-only on the REVERT path too
- Final Image/Copy Swaps Due Task deleted via `deleteWeekItem`
