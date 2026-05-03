# Known issues — prod Runway DB, 2026-04-22

Ranked by impact on staff-facing board vs internal plumbing.

## Staff-facing

### 1. Convergix wrapper missing in data
- Code is complete (schema + unified-view + account-section wrapper card, PR 88 Chunk F).
- Zero rows in prod have `parent_project_id` set.
- Convergix currently renders as 15 flat L1s under the Convergix client header instead of nested under a wrapper retainer.
- **Fix:** standalone data migration — create "Convergix Retainer" wrapper (above L1 in hierarchy; a `projects` row with `engagementType=retainer` and no parent) + set `parent_project_id` on the 17 active Convergix L1s (per updated post-Kathy-cleanup roster; excluding 3 historical completions per operator directive). Operator approved doing this here (explicit permission) once Kathy Q&A comes back and Convergix L1 clean-up writes complete. Ordering: pending CC #1 ship so Week-view wrapper filter is live and wrapper doesn't ghost on This Week view.

### 2. Convergix L1 date/structure deltas vs hot sheet
See `convergix-reconciliation.md` for the full table. Headline items:
- Industry Vertical Campaigns end-date pulled to 2026-07-31 by a "Retainer Period Close" L2 — artificially inflated.
- Brand Guide v2 end-date 2026-04-30 in prod vs 2026-04-23 in hot sheet.
- Rockwell Auto Co-Marketing single-day range (4/23..4/23) isn't realistic — scope TBD.
- AUTOMATE Booth Design is a separate L1 in prod, merged into Events Page Updates on the hot sheet. Modeling call pending Kathy.
- Fanuc Award, New Capacity — may need timing review after Kathy responds.

### 3. Week items with NULL status (24 rows)
- Spread: LPPC 10, Convergix 7, Bonterra 3, Dave Asprey 2, Soundly 1, Hopdoddy 1.
- All are pre-backfill legacy rows. `status=null` is currently treated as `'scheduled'` by the bucket/filter code, so staff probably don't see a functional impact TODAY.
- Migration `scripts/runway-migrations/2026-04-21-backfill-scheduled-status.ts` exists from PR 88 but has not been run.
- **Risk:** CC #2's retainer-v4-cleanup may intentionally set some L2 statuses to NULL per spec (see `project_pr88_shipped.md` post-merge ordering note). If run in the wrong order it could re-introduce NULLs the backfill was supposed to fix. Need to verify order and final state when reviewing CC #2.

### 4. NULL engagement_type on 13 projects
- All Beyond Petro (10) + ABM RFP, AG1 Social Content Trial, EDF TBD, Wilsonart Chester Videos.
- Any code that filters "retainer vs project" treats these as neither.
- Beyond Petro is on an MSA — those should probably be `engagement_type = 'retainer'` once its contract metadata is filled in. Others (ABM RFP, AG1 trial) are genuinely pre-contract and `NULL` may be correct until a contract exists.
- Not urgent unless CC #1 / #2 plan touches these rows.

## Internal plumbing (low staff impact)

### 5. Timestamp encoding mismatch in `updates.created_at` — RESOLVED 2026-04-22
- **Status:** APPLIED under batch_id `timestamp-correction-2026-04-22`. All 38 ms-encoded rows corrected in place (÷1000 → sensible 2026-04-21/22 UTC seconds). Post-verify confirms 0 rows remain ms-encoded globally, total updates count unchanged (758), affected batch row counts preserved (34 + 4 = 38), original `updated_by` values preserved on audit rows.
- **Reference files:** `timestamp-correction.ts` (DRY_RUN/APPLY script with belt-and-suspenders unexpected-batch guard), `timestamp-correction-dryrun.txt`, `timestamp-correction-apply.txt`, `timestamp-correction-verify.ts` + `timestamp-correction-verify.txt`.
- **Forward guard:** do not reuse the `db.run(sql.raw(...))` pattern from the two legacy scripts. Always use Drizzle typed inserts so the timestamp encoder runs. The two source scripts that caused this (`target-to-notes-raw-2026-04-21`, `hotsheet-cleanup-2026-04-22`) should not be reused as templates.

### 6. Batch-hygiene concerns in past migrations
Per operator memory and the revert-retry cycle on retainer-v4-cleanup:
- DRY_RUN skips helper guards — need pre-write validators for each migration (`feedback_dryrun_vs_apply_gap.md`).
- Retries after reverts must bump `updated_by` or audit rows poison idempotency keys (`feedback_revert_idempotency_poisoning.md`).
- Field whitelist: grep migration's `field:` strings against PROJECT_FIELDS / WEEK_ITEM_FIELDS before approving (`feedback_migration_field_whitelist.md`).
- CC #2's retainer-v4-cleanup PR is supposed to address some of these — check its plan for: schema-drift gate (`pnpm runway:generate` empty diff), validateFieldNames helper, UPDATED_BY uniqueness on retries.

## Resolved or non-issues
- `parent_project_id` references: 0 rows reference nonexistent IDs ✓
- `week_items.project_id` / `client_id`: 0 bad refs ✓
- `blocked_by` JSON: 0 malformed / unknown id refs ✓
- Retainer contract dates: 18/18 retainers have both contract_start AND contract_end ✓
- Unique client slugs: ✓
