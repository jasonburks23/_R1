# Data TP rehydrate — 2026-04-27 → 2026-04-28 close

**ALL 4 BATCHES APPLIED CLEAN.** Wave A-F arc complete. Brain doc kept for traceback / audit.

## Final state (2026-04-28 evening)

| Batch | Audit rows | APPLY timestamp | Verify | batch_id |
|---|---|---|---|---|
| **LPPC Phase 3 — Kathy-confirmed** | 22 | 2026-04-28 morning | 10/10 PASS | `lppc-phase3-kathy-confirmed-2026-04-27` |
| **AG1 + Soundly + Bonterra cleanup** | 22 | 2026-04-28 afternoon | 10/10 PASS | `ag1-soundly-bonterra-cleanup-2026-04-27` |
| **HDL Website Build** | 73 | 2026-04-28 afternoon | 17/17 PASS | `hdl-website-build-cleanup-2026-04-27` |
| **Other Accounts** | 10 | 2026-04-28 afternoon | 11/11 PASS | `other-accounts-cleanup-2026-04-27` |

**Totals: 127 audit rows landed across 4 batches, zero post-write assertion failures, zero verify failures.**

## DB health post-APPLY (2026-04-28T05:13:28Z)

- projects: 51 (unchanged)
- weekItems: 81 → 101 (+20 net: 18 HDL creates + 3 Other Accounts creates − 1 HDL delete)
- clients: 13 (unchanged; TAP contractValue updated, no row added)
- updates: 890 → 995 (+105 audit rows = 22+73+10, exact)
- orphans: 0 / 0 / 0 ✓
- staleProjects: 0 ✓
- pastEndL2s: 5 → 4 (Bonterra Internal Review completed)
- activeBatchId: null (clean tail)
- distinctBatchIdsLast7Days: 11 → 14

## What this session caught (fresh-eyes + QA + DRY_RUN gating)

Pre-APPLY safeguards caught **8 real bugs/drift** that DRY_RUN-only gating would have missed:

1. **LPPC recompute time-bomb** (CRITICAL) — fresh-eyes pass. `recomputeProjectDates` prefers `startDate ?? date`. Plan changed only `date`. Map endDate would have reverted from 5/11 → 4/27 on next child write. Fix: paired startDate writes.
2. **LPPC raw-UPDATE concurrency stale** — captured `mapProjectUpdatedAt` at pre-check; children writes fired recompute, advancing it. Fix: re-capture immediately before raw UPDATE.
3. **LPPC audit count off-by-one** — plan said 21, actual was 22 after startDate fix.
4. **AG1+S+B Bonterra Dev Handoff reverse cascade** — `category="deadline"` + `field="date"` would have set Bonterra Project's dueDate. Fix: flip category to "delivery" FIRST.
5. **AG1+S+B engagementType-before-parentProjectId** — validator at `operations-utils.ts:1042` rejects parents whose `engagementType !== "retainer"`. Subagent locked order during drafting.
6. **Soundly Payment Gateway drift** — already at target state in prod + wrong weekOf in plan (4/23 vs prod 4/20). Dropped from batch (24 → 22 audit rows).
7. **HDL fabricated id-prefixes** — drafter wrote `8d75ad57` (Site Live) and `65c8c97c` (Site Staging); neither resolved. Corrected to `51872fd1` and `56e46f3a`.
8. **HDL 13 dayOfWeek calendar errors** — operator wrote from memory; verified via `date` command, patched plan + triplet.
9. **HDL Task #2 silent reverse-cascade trap** (CRITICAL — caught by QA pass + confirmation patch) — Task #2 "Full Site Design Approval" was `category="deadline"` in prod; date write would have committed `Website Build.dueDate=4/29` (wrong; Website Build ends 7/7 LAUNCH). Fix: added category-first flip deadline → approval, mirroring Task #13. Audit count 72 → 73.

## What landed (summary by client)

**LPPC:** 10 Task status flips + Map Project endDate (4/27 → 5/11) + 1 net-new Task (Final Image/Copy Swaps Due 5/4) + various date/notes refreshes. Source: Kathy Slack 2026-04-27.

**AG1:** Social Content Trial → retainer wrapper, PRO Content nested under it, Concept Writeups status+resources fixed.

**Soundly:** AARP pipeline at-risk → signed (waitingOn cleared, notes refreshed).

**Bonterra:** Internal Review completed; Dev Handoff structurally renamed → Dev IR Revisions (9 sequential field writes, category-first ordering); Go Live scheduled.

**HDL Website Build:** Full 28-Task structure landed. 1 project notes refresh + 10 existing-Task UPDATES (53 field writes) + 18 net-new CREATES + 1 DELETE (Domain/URL + Webflow). Project recomputed startDate=2026-04-17, endDate=2026-07-07 (LAUNCH).

**Dave Asprey:** 2 status flips + 1 Drive Folder Handoff create.
**Wilsonart:** Chester Videos → completed.
**EDF:** TBD project → on-hold + notes.
**TAP:** contractValue → "$120,000".
**ABM:** Shortlist Notification (4/22 Wed, completed) + Presentation (5/8 Fri, scheduled) creates.
**Team:** Ronan Lane team_member DELETED (raw drizzle + manual audit row).

## Codified rails (validated this arc)

1. **Per-row optimistic concurrency** (raw UPDATE/DELETE): capture `updated_at` at pre-check, include in WHERE, abort on 0 rows. Used in LPPC Map raw UPDATE + Other Accounts Ronan DELETE.
2. **Category-first ordering** for any reverse-cascade-prone update (`category=deadline + field=date`). Used in Bonterra Dev Handoff (deadline → delivery), HDL #13 Production Shoot (deadline → delivery), HDL #2 Full Site Design Approval (deadline → approval).
3. **Engagement-type-first ordering** for any `parentProjectId` assignment where parent must be retainer. Used in AG1 PRO Content under Social Content Trial.
4. **Paired startDate with date writes** to defuse recompute time-bomb. Used in every batch.
5. **Multi-field lookup-key drift trackers** (`currentTitle`, `currentWeekOf`) when both can change mid-batch. Used in HDL #1, #5, #20 + AG1+S+B Bonterra Dev Handoff.
6. **REVERT distinct UPDATED_BY** (`REVERT-{batch_id}`) to avoid idempotency-key poisoning. Used in all triplets.
7. **Manual audit insert mirrors helper conventions** (column shape, batchId, idempotencyKey via SHA, metadata JSON). Used in Other Accounts Ronan DELETE.
8. **Audit-row math by helper:** updateProjectField/updateWeekItemField/updateClientField/createWeekItem/deleteWeekItem = 1 row per call; updatePipelineItem = 1 row PER FIELD; raw UPDATE/DELETE + manual audit = 1 row.
9. **Field whitelist gate:** every `field:` string against PROJECT_FIELDS / WEEK_ITEM_FIELDS / CLIENT_FIELDS in operations-utils.ts before APPLY.
10. **Skip Slack publish for cleanup batches** (per `feedback_skip_slack_publish_cleanup.md`). All 4 batches deliberately skipped.

## HDL operator-review items (not blocking, separate decision)

These were drafter intent-placeholders. None are wrong; operator can override values via a corrective batch if desired:

1. **Task #10 Batch 2 Dev endDate** — created as single-day kickoff (date=startDate=5/25, endDate=null).
2. **Task #19 HDL Confirm to Launch** — set 7/2 (Thu, 5 BD before LAUNCH 7/7).
3. **Tasks #21 Schema/SEO/AIO + #22 Ad Words + #23 Smokeball notes** — drafter wrote intent-capturing placeholders with "OPERATOR: verify verbatim" markers. Brain doc references "Jill 8 inline notes 2026-04-27" — likely in Slack, not yet incorporated verbatim.
4. **Project Website Build notes** — drafter's 28-Task summary landed; operator may refine.

## Slackbot data-entry pattern (recurring, NOT a bug — Future-work backlog)

Surfaced 3x this arc:
- AG1 (Allison) — created PRO Content Project flat instead of nested; null status; non-standard resources
- Bonterra (Jill) — created new Tasks but left existing nulls
- (Captured in Future-work backlog, smarter create UX)

## Worktree

`.worktrees/data-tp-runway`, branch `feature/data-tp-cluster3` (from upstream/runway @ 66e9e36, PR 94).

**DISPOSABLE.** No code PRs needed. Operator runs `git worktree remove .worktrees/data-tp-runway` when ready.

## Triplets on disk (preserved for audit + REVERT)

`.worktrees/data-tp-runway/scripts/runway-migrations/`:
- `lppc-phase3-kathy-confirmed-{2026-04-27, verify-2026-04-27, REVERT-2026-04-27}.ts`
- `ag1-soundly-bonterra-cleanup-2026-04-27.{ts, -verify.ts, -REVERT.ts}`
- `hdl-website-build-cleanup-2026-04-27.{ts, -verify.ts, -REVERT.ts}`
- `other-accounts-cleanup-2026-04-27.{ts, -verify.ts, -REVERT.ts}`

REVERT scripts available for emergency rollback. Distinct UPDATED_BY (`REVERT-{batch_id}`) — re-APPLY after REVERT requires bumping primary's UPDATED_BY (per `feedback_revert_idempotency_poisoning.md`).

## Convergix wrapper (unchanged this arc)

Wrapper `4171aa4d…` still has 16 children. 12 active L1s + 4 newly-completed-but-still-parented (Brand Guide v2, Rockwell PartnerNetwork Article, Events Page Updates, Social Content May 2026). Recompute guard predicate intact. Future Cluster 4 question (do completed L1s under a wrapper get unparented post-completion?) — not urgent.

## Memory cross-refs

- `project_data_tp_multi_wave_2026-04-27.md` — this state (close marker)
- `project_runway_post_pr94.md` — broader runway state
- `project_convergix_cleanup_applied.md` — Convergix arc history
- `feedback_fresh_eyes_pass_before_apply.md` — pattern that caught 5+ of the bugs above
- `feedback_qa_agent_for_prod_writes.md` — QA-pass pattern that caught HDL Task #2 trap

## Future-work backlog (hand to R1 TP / product when scheduled)

1. Smarter create-Project / create-Task data-entry UX (parent-Project picker, resources role-prefix validation, status default to scheduled).
2. L3 / sub-task layer evaluation — start with `track` field on `week_items` (lowest lift).
3. Gantt as Slackbot output — `docs/tmp/hdl-gantt.html` is a working template.
4. Smart MCP enrichment plan (captured in `project_mcp_enrichment_plan.md`).
