# Cluster 2 execution plan — Convergix wrapper create + nest 17 active L1s

**Purpose:** Authoring blueprint for the post-CC-#1-merge Convergix wrapper migration. Read this + `wrapper-state-audit.md` + `/data-integrity` skill before writing the tsx script.

**Gate:** CC #1 merged to `upstream/runway`. Re-pull prod. Confirm no drift. Then author + DRY_RUN + QA + APPLY.

**NOT gated on CC #2.** Project creation + `parent_project_id` updates on children don't trigger recompute on the wrapper itself (recompute fires on L2 writes, not project-field updates). Cluster 2 is safe with current recompute behavior. Cluster 3 is gated on CC #2's guard.

---

## Batch identity

- `batch_id`: `convergix-wrapper-create-<YYYY-MM-DD>` (actual run date)
- `updated_by`: `convergix-wrapper-create-<YYYY-MM-DD>` (identical to batch_id per idempotency convention)
- If retry after revert: bump to `convergix-wrapper-create-<YYYY-MM-DD>-run2` etc. per `feedback_revert_idempotency_poisoning`.

---

## Writes inventory (18 total audit rows)

### Write 1: INSERT wrapper project

**Table:** `projects`
**Operation:** addProject (via operations-writes-project.ts helper, drizzle typed insert)

**Fields (all locked 2026-04-23 per `project_convergix_cleanup_applied.md` auto-memory):**

| Field | Value |
|---|---|
| `id` | generated UUID |
| `name` | `"Convergix Retainer"` (NO dates in name — dates are in contract fields) |
| `clientId` | `181fea93bc4d435db0a1a8283` (Convergix UUID; slug="convergix") |
| `engagementType` | `"retainer"` |
| `status` | `"in-production"` |
| `category` | `"active"` |
| `owner` | `"Kathy"` |
| `resources` | `NULL` (team stays on client; wrapper pulls via get_retainer_team helper) |
| `contractStart` | `"2026-02-01"` |
| `contractEnd` | `"2026-07-31"` |
| `startDate` | `"2026-02-01"` (EXPLICIT — supersedes "let recompute populate"; CC #2's guard will freeze this once children nest) |
| `endDate` | `"2026-07-31"` (EXPLICIT — same reasoning) |
| `dueDate` | `NULL` |
| `waitingOn` | `NULL` |
| `notes` | `"Retainer-period container for 2026-02-01 to 2026-07-31 Convergix contract (1H 2026 SOW). Children L1s nest via parent_project_id. 2H renewal would create a new wrapper, not extend this one."` |
| `parentProjectId` | `NULL` (wrapper is top of hierarchy for this client) |
| `staleDays` | `0` |
| `sortOrder` | `0` (renders atop Convergix section on By Account view) |
| `createdAt` | `<now>` |
| `updatedAt` | `<now>` |

Audit: 1 row, `updateType = "create-project"`, `field = NULL`, `oldValue = NULL`, `newValue = <full row JSON or summary>`.

### Writes 2-18: UPDATE each of 17 active L1s, set `parent_project_id = <wrapper.id>`

**Table:** `projects`
**Operation:** updateProjectField (via operations-writes-project.ts helper) — new capability from CC #2's Commit 11 (parentProjectId added to PROJECT_FIELDS whitelist).

**Canonical 17 active Convergix L1 IDs (fresh prod 2026-04-23T15:19 UTC):**

| # | ID (truncated) | Name | Current status |
|---|---|---|---|
| 1 | `0c208308ff...` | New Capacity (PPT, brochure, one-pager) | awaiting-client |
| 2 | `3d5215f4a3...` | Fanuc Award Article + LI Post | not-started |
| 3 | `135c5a61d5...` | Events Page Updates (5 tradeshows) | in-production |
| 4 | `394f9e5e5b...` | Rockwell PartnerNetwork Article | in-production |
| 5 | `c093535940...` | Texas Instruments Article | in-production |
| 6 | `f391dff5ce...` | Social Content — April 2026 | in-production |
| 7 | `51f39e5cdf...` | Brand Guide v2 | in-production |
| 8 | `68a4ee3791...` | Certifications Page | awaiting-client |
| 9 | `0e4214c607...` | CDS Vertical Campaign | in-production |
| 10 | `65b2cac113...` | Corporate Collateral Updates | in-production |
| 11 | `0157c4232d...` | Big Win Template | in-production |
| 12 | `1923fc1a36...` | Rockwell Automation Co-Marketing Efforts | awaiting-client |
| 13 | `272e7eef7f...` | AUTOMATE 2026 Booth Design | in-production |
| 14 | `b452f64704...` | Social Content — May 2026 | in-production |
| 15 | `ede98a2931...` | Social Content — June 2026 | not-started |
| 16 | `9396b7a0c2...` | Social Content — July 2026 | not-started |
| 17 | `95ba6a2f17...` | Industrial/Battery Assembly Campaign | not-started |

**Full IDs:** read from `.worktrees/pr88-v4-hardening/data/runway-snapshot.json` at execution time (freshly pulled), filter where `clientId === "181fea93bc4d435db0a1a8283"` AND `status !== "completed"`.

**EXCLUDE 3 historical completions (operator directive 2026-04-22):**
- `4b5bf2f080...` Life Sciences Brochure
- `c568d7a62c...` Social Media Templates
- `7c8478dc5...` Organic Social Playbook

Per write: `updateType = "field-change"`, `field = "parentProjectId"`, `oldValue = NULL`, `newValue = <wrapper.id>`.

Audit: 17 rows.

---

## Pre-write validators

Run these BEFORE any drizzle typed insert executes:

1. **Wrapper doesn't already exist.** Query:
   ```sql
   SELECT id, name FROM projects
   WHERE client_id = '181fea93bc4d435db0a1a8283'
     AND engagement_type = 'retainer'
     AND parent_project_id IS NULL
     AND name = 'Convergix Retainer';
   ```
   Expect 0 rows. If 1+ rows → abort (wrapper was created out-of-band).

2. **All 17 target L1s exist and belong to Convergix.** Query:
   ```sql
   SELECT id, name, status, parent_project_id FROM projects
   WHERE id IN (<17 IDs>)
     AND client_id = '181fea93bc4d435db0a1a8283';
   ```
   Expect 17 rows. All should have `parent_project_id IS NULL`. If any row missing or has parent set → abort.

3. **Field whitelist grep.** Ensure `parentProjectId` is in `PROJECT_FIELDS` at `src/lib/runway/operations-utils.ts` (CC #2 Commit 11 adds it). If not present → CC #2 hasn't fully shipped, abort.

4. **3 historical L1s are still completed + unparented** (sanity — not mutated by this batch):
   ```sql
   SELECT id, name, status, parent_project_id FROM projects
   WHERE id IN ('4b5bf2f080...', 'c568d7a62c...', '7c8478dc5...');
   ```
   Expect all 3 with `status = 'completed'` and `parent_project_id IS NULL`.

---

## Transaction ordering

**Single transaction if possible:**
1. INSERT wrapper → capture `wrapper.id`.
2. UPDATE each of 17 L1s with `parent_project_id = wrapper.id`.
3. Insert 18 audit rows via `insertAuditRecord`.
4. Commit.

**Why single transaction:** if any step fails, the whole thing rolls back. No half-nested state.

**If drizzle libsql doesn't support nested inserts cleanly in one transaction:** fall back to 18 separate operations, each via helper (addProject + 17x updateProjectField), each auto-writes audit. All under the same batch_id (setBatchId at start, clear in finally).

---

## Post-apply verification

Write `convergix-wrapper-create-verify.ts`:

1. Wrapper exists with exact locked metadata:
   ```sql
   SELECT * FROM projects WHERE name = 'Convergix Retainer';
   ```
   Assert: `engagementType='retainer'`, `clientId='181fea93bc4d435db0a1a8283'`, `status='in-production'`, `category='active'`, `owner='Kathy'`, `resources IS NULL`, `contractStart='2026-02-01'`, `contractEnd='2026-07-31'`, `startDate='2026-02-01'`, `endDate='2026-07-31'`, `sortOrder=0`, `parentProjectId IS NULL`.

2. Exactly 17 children nested:
   ```sql
   SELECT COUNT(*) FROM projects WHERE parent_project_id = '<wrapper.id>';
   ```
   Assert: 17.

3. 3 historical completions unparented:
   ```sql
   SELECT name FROM projects
   WHERE client_id = '181fea93bc4d435db0a1a8283'
     AND status = 'completed'
     AND parent_project_id IS NULL;
   ```
   Assert: 3 rows, matching the 3 historical completion names.

4. 18 audit rows under batch_id:
   ```sql
   SELECT COUNT(*), MIN(created_at), MAX(created_at)
   FROM updates WHERE batch_id = '<batch_id>';
   ```
   Assert: count = 18, timestamps contained within the APPLY window.

5. No ms-encoded timestamps in the new audit rows:
   ```sql
   SELECT COUNT(*) FROM updates
   WHERE batch_id = '<batch_id>' AND created_at > 1000000000000;
   ```
   Assert: 0.

6. `pnpm runway:check-orphans` (shipped by CC #2 at `scripts/runway-migrations/check-orphan-parent-project-ids.ts`). Exit code 0.

7. Total project row count:
   ```sql
   SELECT COUNT(*) FROM projects;
   ```
   Assert: 50 (was 49 pre-Cluster-2).

8. UI spot-check (manual, operator):
   - By Account view: Convergix section has "Convergix Retainer" umbrella card at top with "Feb 1 → Jul 31" timeline visible.
   - 17 nested L1s under it (render depends on CC #1's 4A work being correct).
   - 3 historical completions appear as separate cards (or hidden, depending on completed-filter state).
   - Week view: wrapper does NOT appear (CC #1 Phase D filter).
   - Bot query: "who's on Convergix Retainer team" → returns dedup'd team (CC #1 4C `get_retainer_team` tool live).

---

## 2-pass QA agent pattern

Per `feedback_qa_agent_for_prod_writes`:

**Pass 1** — spawn general-purpose agent with full context:
- This plan doc
- `wrapper-state-audit.md`
- Locked metadata from `project_convergix_cleanup_applied.md`
- DRY_RUN output (`convergix-wrapper-create-dryrun.txt`)
- `/data-integrity` skill files

Ask: bugs, plan-vs-script mismatches, locked-metadata coverage gaps, rails violations (field whitelist, direct L1 date writes on children? — no; wrapper's startDate/endDate is on wrapper itself via create, fine), transaction ordering risks, audit-trail correctness, anything pausable. Priority tags: critical / warning / nit. Cap ~800 words.

Fix issues found. Re-DRY_RUN.

**Pass 2** — spawn second fresh-context agent (not SendMessage the first). Same context, different priors. Ask: verify each Pass 1 fix landed AND hunt new issues. Same report shape.

**Skip Pass 2 criteria:** Only if Pass 1 finds zero critical/warning AND the operation is deterministic + single-column-transform (not applicable here — Cluster 2 creates a new row AND touches 17 existing rows, structural).

Pass 2 is recommended for Cluster 2.

---

## Revert script

Write `convergix-wrapper-revert.ts` for safety, run only if post-verify fails:

1. UPDATE 17 L1s: set `parent_project_id = NULL`.
2. DELETE wrapper row.
3. Audit rows: 18 new under `batch_id = "convergix-wrapper-revert-<YYYY-MM-DD>"`, `updated_by = "convergix-wrapper-revert-<YYYY-MM-DD>"`.

Keep revert in DRY_RUN default, same APPLY=true gate.

---

## Post-apply doc updates

1. `pending-decisions.md` adjustment log: new row.
2. `project_convergix_cleanup_applied.md` auto-memory: move Cluster 2 from pending → applied. Note Cluster 3 still pending CC #2 merge.
3. `data-shape.md`: row counts (projects 49 → 50, audit ~758 → ~776).
4. `known-issues.md` #1 (Convergix wrapper missing in data): mark RESOLVED with batch_id reference.
5. `handoff.md`: refresh for Cluster 3 scenario.

---

## What comes after Cluster 2

**Immediately after Cluster 2:** operator QA on By Account view + Week view + bot team query. Capture any surface-level issues.

**Then wait on CC #2 merge** for Cluster 3 (retainer-renewal Task on wrapper). Do NOT execute Cluster 3 until CC #2's recompute guard is live in prod. Running Cluster 3 without the guard would collapse wrapper dates to single-day (2026-05-25).

**In parallel:** Phase 3 question doc refinement with operator (whenever Kathy returns it for revisions), then Kathy receives, then per-row backfill execution when replies arrive.
