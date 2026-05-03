# Retainer + v4 Cleanup Migration Spec

**Date:** 2026-04-21
**Target branch:** off `upstream/runway` (post PR #86 merge, post PR #87 merge)
**New branch suggestion:** `feature/runway-retainer-v4-cleanup`
**Scope:** 35 discrete data changes across 7 clients (Convergix, Asprey, Hopdoddy, Soundly, LPPC, TAP, HDL) in Runway prod Turso. HDL + TAP + LPPC Dev Kickoff + Soundly Payment Gateway In Dev L2s added late via In Flight fix pass (D.13–D.16).
**Safety:** fully reversible via companion REVERT script; supports DRY_RUN mode; pre-apply snapshot JSON

---

## Overview

Clean up Runway's prod data to match the v4 convention locked in PR #86:
1. **Retainer tier classification** — Convergix, Asprey, Hopdoddy Digital Retainer gain `engagement_type=retainer` + contract dates. Soundly Payment Gateway flips back to project (was mislabeled).
2. **Convergix v4 polish** — L1 end_date corrections, waitingOn backfill, 6 null-status L2 fixes, 2 multi-day L2 endDates.
3. **Cross-client v4 gaps** — Soundly AARP dates, Asprey multi-day L2, Hopdoddy Brand Refresh owner/resources/engagementType fixes.
4. **LPPC Slack-alignment** — honor Kathy's 4/21 updates, flip 6 blanket-blocked L2s to NULL, create 3 new L2s, append one L1 notes.

**Out of scope (deferred to future coding PR):**
- `parent_project_id` for retainer wrapper
- Explicit `scheduled` L2 status value + NULL backfill (see `docs/brain/future-scheduled-l2-status.md`)
- HDL, Bonterra, TAP, ABM, AG1, Beyond Petro, EDF, Wilsonart data

---

## Trust-preservation rules (READ FIRST)

**DO NOT modify any record with `updatedAt >= 2026-04-21 14:00 UTC` unless explicitly listed in this spec.**

Specifically:
- **LPPC `Interactive Map` L1** — Kathy updated the `target` field at 14:04:48 UTC. DO NOT null or change `target`. Her text ("Present revised map by 4/24. QA 4/21-4/23, Launch 4/27.") stays as-is.
- **LPPC `Website Revamp` L1** — `notes` were touched at 14:04:44. Only the **APPEND operation in section D.8 below** touches the `notes` field. No other edits.
- **LPPC `R3 Design Review` L2** — Kathy touched notes at 14:04:44. Only the endDate change in D.1 below. Do NOT touch notes.
- **LPPC `Map Client Clarity Ping` L2** — Kathy touched notes at 14:04:44. Only the status change in D.2 below. Do NOT touch notes (her "Client clarity resolved 4/21. Good to go. Next step: present revised map by end of week, 4/24." is intent preserved).

Anything in LPPC not listed in this spec: do not touch.

---

## Full change list (31 items)

### Section A — Retainer tier classification (5 changes)

#### A.1 Convergix — all 15 L1s → retainer

**Target:** all projects where `client.slug='convergix'`
**SET:** `engagement_type='retainer'`, `contract_start='2026-02-01'`, `contract_end='2026-07-31'`
**Source:** Convergix 2026 1H Marketing Retainer SOW (https://docs.google.com/document/d/1Ny5aGmUaKq7BENF7-xwjHRnnO-P9CSebHQ-ew7poTZk)

**Current state:** all 15 projects have `engagement_type='project'`, NULL contract dates.

#### A.2 Asprey — Social Retainer — Wind Down L1 → contract_start only

**Target:** `projects` where `client.slug='dave-asprey'` AND `name='Social Retainer — Wind Down'`
**SET:** `contract_start='2025-11-14'`
**Leave unchanged:** `engagement_type` (already 'retainer'), `contract_end` (already '2026-04-30')
**Source:** operator-provided.

#### A.3 Hopdoddy — Digital Retainer (195 hrs) L1 → retainer + owner + dates

**Target:** `projects` where `client.slug='hopdoddy'` AND `name='Digital Retainer (195 hrs)'`
**SET:** `engagement_type='retainer'`, `contract_start='2026-01-01'`, `contract_end='2026-12-31'`, `owner='Jill'`
**Source:** Hopdoddy FY26 Digital Retainer SOW (https://docs.google.com/document/d/1nbP6LLX3o_6NNWT4BNsxIPlFmSMV6iAz)

**Current state:** `engagement_type=null`, `contract_start=null`, `contract_end=null`, `owner=null`.

#### A.4 Hopdoddy — Brand Refresh Website L1 → owner/resources/engagementType

**Target:** `projects` where `client.slug='hopdoddy'` AND `name='Brand Refresh Website'`
**SET:** `owner='Jill'` (was 'Leslie'), `resources='AM: Jill, CD: Lane, Dev: Leslie'` (was NULL), `engagement_type='project'` (was NULL)
**Leave unchanged:** status, startDate, endDate, notes, all other fields

**Rationale:** Hopdoddy is Jill's account. Leslie was L1 owner because she led design (now done); project is transitioning to launch phase (Jill's domain). Leslie moves to resources.

#### A.5 Soundly — Payment Gateway Page L1 → project (flip back)

**Target:** `projects` where `client.slug='soundly'` AND `name='Payment Gateway Page'`
**SET:** `engagement_type='project'` (was 'retainer'), `contract_end=null` (was '2026-05-31'), `end_date='2026-05-31'` (was '2026-04-23' — earlier v4 backfill; migration overwrites with correct project deadline per rationale below)
**Leave unchanged:** all other fields

**Rationale:** Soundly retainer is for web maintenance, not tracked on this board. Payment Gateway is a discrete project-SOW. The date `2026-05-31` was the project deadline stored in `contract_end`; moves to its correct home in `end_date`.

---

### Section B — Convergix polish (12 changes)

#### B.1 Events Page Updates (5 tradeshows) L1 end_date

**Target:** `projects` where `client.slug='convergix'` AND `name='Events Page Updates (5 tradeshows)'`
**SET:** `end_date='2026-11-30'` (was '2026-05-04')

**Rationale:** Tradeshows span May–November (AIST May, Automation Fair November). Prior value was blanket backfill.

#### B.2 Corporate Collateral Updates L1 end_date

**Target:** `projects` where `client.slug='convergix'` AND `name='Corporate Collateral Updates'`
**SET:** `end_date='2026-06-30'` (was '2026-04-30')

**Rationale:** Blocked on Daniel + Fanuc Award info post-4/28. Realistic completion June-end.

#### B.3 Industry Vertical Campaigns L1 end_date + waitingOn

**Target:** `projects` where `client.slug='convergix'` AND `name='Industry Vertical Campaigns'`
**SET:** `end_date='2026-07-31'` (was '2026-04-30'), `waitingOn='Jared, Bob'` (was NULL)
**Leave unchanged:** status (stays `in-production` — CDS Creative Wrapper L2 is active)

**Rationale:** Two full retainer-length campaigns (SOW scope: 6 deliverables each). `waitingOn` captures CDS R1 feedback blocker (Jared + Bob are client-side). Jamie Nelson connect is Civ-side, not on waitingOn.

#### B.4 Brand Guide v2 (secondary palette) L1 waitingOn

**Target:** `projects` where `client.slug='convergix'` AND `name='Brand Guide v2 (secondary palette)'`
**SET:** `waitingOn='JJ'` (was NULL)

**Rationale:** L1 notes explicitly state "Blocked until New Capacity PPT R4 approved by JJ."

#### B.5 Events Page — 2026 Updates Live L2 status + endDate

**Target:** `week_items` where `client.slug='convergix'` AND `title='Events Page — 2026 Updates Live'`
**SET:** `status='in-progress'` (was NULL), `end_date='2026-04-23'` (was NULL)

**Rationale:** Single-day launch 4/23, active prep this week. endDate=startDate prevents past-end flag if Kathy forgets to flip to completed on 4/23; hits flag appropriately on 4/24 as useful signal.

#### B.6 April Social — Week of 4/20 Posts (4 posts) L2 status + endDate

**Target:** `week_items` where `client.slug='convergix'` AND `title='April Social — Week of 4/20 Posts (4 posts)'`
**SET:** `status='in-progress'` (was NULL), `end_date='2026-04-27'` (was NULL)

**Rationale:** Week-of-4/20 multi-day social content. Kathy + Sami actively drafting through Sunday 4/27.

#### B.7 Rockwell Partner Award — Image Swap L2 status

**Target:** `week_items` where `client.slug='convergix'` AND `title='Rockwell Partner Award — Image Swap'`
**SET:** `status='blocked'` (was NULL)

**Rationale:** Parent L1 `Rockwell PartnerNetwork Article` waitingOn=Daniel (4-day stale). Upstream feedback blocked.

#### B.8 Rockwell Partner Award — Social Post L2 status

**Target:** `week_items` where `client.slug='convergix'` AND `title='Rockwell Partner Award — Social Post'`
**SET:** `status='blocked'` (was NULL)

**Rationale:** Blocked downstream of Image Swap.

#### B.9 Texas Instruments Award — Page Build L2 status

**Target:** `week_items` where `client.slug='convergix'` AND `title='Texas Instruments Award — Page Build'`
**SET:** `status='blocked'` (was NULL)

**Rationale:** Same as B.7 — parent waitingOn=Daniel.

#### B.10 Texas Instruments Award — Social Post L2 status

**Target:** `week_items` where `client.slug='convergix'` AND `title='Texas Instruments Award — Social Post'`
**SET:** `status='blocked'` (was NULL)

**Rationale:** Blocked downstream of Page Build.

#### B.11 CDS Creative Wrapper L2 endDate

**Target:** `week_items` where `client.slug='convergix'` AND `title='CDS Creative Wrapper'`
**SET:** `end_date='2026-05-07'` (was NULL)
**Leave unchanged:** status (already `in-progress`)

**Rationale:** Multi-day creative deliverable. 2-week window from startDate 4/23 typical for retainer creative work.

#### B.12 AIST tradeshow L2 endDate

**Target:** `week_items` where `client.slug='convergix'` AND `title='AIST tradeshow'`
**SET:** `end_date='2026-05-07'` (was NULL)
**Leave unchanged:** status (NULL is correct — scheduled future)

**Rationale:** AISTech typically 4-day event Mon-Thu; L2 category=delivery represents events-page presence during that window.

---

### Section C — Soundly + Asprey v4 gaps (2 changes)

#### C.1 Soundly — AARP Member Login + Landing Page L1 dates

**Target:** `projects` where `client.slug='soundly'` AND `name='AARP Member Login + Landing Page'`
**SET:** `start_date='2026-04-17'` (was NULL), `end_date='2026-07-15'` (was NULL)

**Rationale:** Record created 2026-04-17 (proxy for SOW kickoff per L1 notes "SOW signed and kicked off"). endDate from explicit "Launch target 7/15" in notes.

#### C.2 Asprey — Daily Social Posts + ManyChat — Retainer L2 endDate

**Target:** `week_items` where `client.slug='dave-asprey'` AND `title='Daily Social Posts + ManyChat — Retainer (through 4/30)'`
**SET:** `end_date='2026-04-30'` (was NULL)
**Leave unchanged:** status (stays `in-progress`)

**Rationale:** Multi-day retainer activity through contract end 4/30. **Fixes live past-end-l2 flag noise** (currently the only defense against the flag is NULL endDate falling back to startDate=4/20 < today).

---

### Section D — LPPC Slack-alignment (12 changes)

#### D.1 R3 Design Review L2 endDate

**Target:** `week_items` where `client.slug='lppc'` AND `title='R3 Design Review'`
**SET:** `end_date='2026-04-22'` (was NULL)
**Leave unchanged:** status, notes, everything else

**Rationale:** Kathy's notes (updated 14:04:44) state "feedback due 4/22" — extracts her timeline into structured field. If she forgets to flip to completed after 4/22, past-end flag fires appropriately.

#### D.2 Map Client Clarity Ping L2 status

**Target:** `week_items` where `client.slug='lppc'` AND `title='Map Client Clarity Ping'`
**SET:** `status='completed'` (was `blocked`)
**Leave unchanged:** notes (her "Client clarity resolved 4/21. Good to go. Next step: present revised map by end of week, 4/24." — her stated intent)

**Rationale:** Her notes explicitly say "resolved." Status translation; notes preserved.

#### D.3 CREATE L2 — Interactive Map — Dev Revisions

**NEW record. Must populate:**
- `client_id`: LPPC's client.id
- `project_id`: LPPC `Interactive Map` L1 id (CC: query by `client.slug='lppc'` AND `projects.name='Interactive Map'`)
- `title`: `Interactive Map — Dev Revisions`
- `start_date`: `2026-04-22`
- `end_date`: `2026-04-24`
- `status`: NULL (scheduled — dev work hasn't started yet)
- `category`: `delivery`
- `owner`: `Leslie`
- `notes`: `Dev revisions after client clarity resolved 4/21. Deliver by 4/24 for Kathy to present. QA window 4/21-4/23, launch 4/27.`
- `blocked_by`: NULL
- Generate `id` as UUID (or use standard ID generation for runway)

**Rationale:** Kathy confirmed (Slack, 2026-04-21 10:15) the 4/24 revisions are on Leslie's plate. New L2 gives Leslie visibility on her plate for the dev work window.

#### D.4 CREATE L2 — Present Revised Map

**NEW record. Must populate:**
- `client_id`: LPPC's client.id
- `project_id`: LPPC `Interactive Map` L1 id (same as D.3)
- `title`: `Present Revised Map`
- `start_date`: `2026-04-24`
- `end_date`: NULL (single-day per existing convention)
- `status`: NULL (scheduled)
- `category`: `delivery`
- `owner`: `Kathy`
- `notes`: `Present revised Interactive Map to LPPC. Follows Leslie's dev revisions completing 4/24. Then launch 4/27.`
- `blocked_by`: NULL

**Rationale:** Kathy's 4/24 client presentation — the milestone she committed to in her Map Client Clarity Ping notes.

#### D.5 CREATE L2 — Policy Materials Import (LPPC)

**NEW record. Must populate:**
- `client_id`: LPPC's client.id
- `project_id`: LPPC `Website Revamp` L1 id (CC: query by `client.slug='lppc'` AND `projects.name='Website Revamp'`)
- `title`: `Policy Materials Import (LPPC)`
- `start_date`: `2026-04-27`
- `end_date`: NULL
- `status`: `blocked`
- `category`: `kickoff`
- `owner`: `Kathy`
- `notes`: `Matt organizing policy materials for tagging in CMS — will import into Advocacy collection. Upstream of Advocacy page launch. Per Kathy 4/17. Waiting on: Matt (LPPC).`
- `blocked_by`: NULL

**Rationale:** Client-side blocker pattern (matches existing `Website Blog Posts — Awaiting LPPC Content` and `MyLPPC Training Video — Awaiting PDF Guide` L2s).

**Schema note:** `week_items` table does NOT have a `waitingOn` field (verified — only `projects` table has `waitingOn`). The "waiting on: Matt" info lives in `notes` as shown above. This is the authoritative pattern for all L2 waiting-on context until schema is extended.

#### D.6 APPEND Website Revamp L1 notes

**Target:** `projects` where `client.slug='lppc'` AND `name='Website Revamp'`
**ACTION:** APPEND (not replace) the following sentence to existing `notes` field:
> ` Pending from LPPC: Bill collecting member photo/video contributions — no timeline yet (per Kathy 4/17 Slack).`

**Implementation:** `UPDATE ... SET notes = notes || ' Pending from LPPC: ...'` — preserve existing content verbatim.

**Revert approach:** The pre-apply snapshot (see "Pre-apply snapshot" in the Migration script structure section) captures the full original `notes` field for this L1. The REVERT script restores `notes` from that snapshot — **do NOT use SQL string manipulation like `REPLACE(notes, '<appended string>', '')`**. Snapshot restore is the authoritative reversal mechanism for this change, to avoid fragility if the notes field is edited between apply and revert.

**Rationale:** Captures vague pending item without creating an unactionable L2. Updates at L1 notes level so Kathy can see it when reviewing the L1.

#### D.7–D.11 Website Revamp blanket-blocked L2s → NULL (5 changes)

**Target:** `week_items` where `client.slug='lppc'` AND title IN:
- `Pencils Down + Images Due`
- `Staging Links Due`
- `LPPC Staging Feedback Due`
- `QA Phase`
- `Website Launch`

**SET:** `status=NULL` (was `blocked`)
**Leave unchanged:** all other fields (notes, dates, owner, category)

**Rationale:** These were blanket-set to `blocked` by yesterday's cleanup script at 23:06 UTC — NOT by Kathy. Under PR #86 NULL-semantic, these are future-scheduled milestones, not actively blocked. Flipping to NULL removes false signal from bot/flags/plate.

**Filter safety:** all 5 have `updated_at = 2026-04-20T23:06:*` timestamps. If a CC pre-check finds any of these with `updatedAt > 2026-04-21 14:00`, STOP — Kathy has since touched it, do not overwrite.

#### D.12 Interactive Map Launch L2 → NULL

**Target:** `week_items` where `client.slug='lppc'` AND `title='Interactive Map Launch'`
**SET:** `status=NULL` (was `blocked`)
**Leave unchanged:** all other fields

**Rationale:** Same blanket-cleanup issue as D.7–D.11. Scheduled future launch 4/27, not blocked.

#### D.13 LPPC Development Kickoff L2 — add resources + endDate

**Target:** `week_items` where `client.slug='lppc'` AND `title='Development Kickoff'`
**SET:** `end_date='2026-04-23'` (was NULL), and (if `week_items` has a `resources` field — see schema note below) `resources='AM: Kathy, Dev: Leslie'`
**Leave unchanged:** owner (stays `Kathy` per LPPC convention — AM owns L2s), status (stays `in-progress`), startDate (stays `2026-04-20`), category (stays `kickoff`), notes

**Rationale:** This L2 was meant to signal Leslie is now doing dev work after Monday's kickoff. Setting endDate=4/23 (Pencils Down per L1 schedule) captures the dev work window and makes the L2 render in the In Flight section. Leslie in `resources` makes her specialist ownership explicit while Kathy retains AM ownership.

**Schema note:** If `week_items` table lacks a `resources` field (it may only live on projects — CC verify during plan mode), include Leslie in the notes instead: append `" Dev: Leslie."` to existing notes. Do NOT alter the existing notes content, APPEND only.

#### D.14 TAP — ERP Rebuild — Development L2 — add endDate

**Target:** `week_items` where `client.slug='tap'` AND `title='ERP Rebuild — Development'`
**SET:** `end_date='2026-08-15'` (was NULL)
**Leave unchanged:** owner, status (stays `in-progress`), startDate, category, notes, all other fields

**Rationale:** L1 notes say "Firmly in Dev right now. Iterative, module by module. Target Mid-April-Mid-August." 2026-08-15 captures mid-August end-of-dev target. Removes current past-end flag AND makes the L2 visible in In Flight as a long-running dev engagement.

**Note:** TAP was flagged as out-of-scope in earlier versions of this spec (per `engagement_type='project'` classification remaining unchanged). This endDate addition is a surgical v4 polish fix only; it does NOT change TAP's engagement_type classification or any other TAP data.

#### D.15 HDL — Full Site Design — Civ Delivers L2 — add endDate

**Target:** `week_items` where `client.slug='hdl'` AND `title='Full Site Design — Civ Delivers'`
**SET:** `end_date='2026-04-24'` (was NULL) — matches startDate (single-day delivery event per existing convention)
**Leave unchanged:** owner (Jill), status (stays `in-progress`), startDate (2026-04-24), category (delivery), notes

**Rationale:** L2 notes say "Lane kicked off Mon 4/20, target Fri 4/24 delivery." Single-day Civ-to-client delivery event. Setting endDate=startDate prevents ambiguity; if Jill doesn't flip to completed on 4/24, past-end flag appropriately fires on 4/25 as a useful signal. HDL was flagged as out-of-scope per `engagement_type='project'` stays unchanged — this is a surgical v4 polish only.

#### D.16 Soundly — Payment Gateway Page — In Dev L2 — add endDate

**Target:** `week_items` where `client.slug='soundly'` AND `title='Payment Gateway Page — In Dev'`
**SET:** `end_date='2026-05-31'` (was NULL) — matches parent L1 `end_date` (being set via A.5)
**Leave unchanged:** owner (Jill), status (stays `in-progress`), startDate (2026-04-23), category (delivery), notes

**Rationale:** Parent L1 `Payment Gateway Page` has `end_date=2026-05-31` (set in A.5 from the old contract_end value). The dev L2 runs through project completion. Gives Jill a realistic dev window on her plate.

---

## Migration script structure

File naming (per existing repo convention):
- Forward: `scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.ts`
- Revert: `scripts/runway-migrations/retainer-v4-cleanup-2026-04-21-REVERT.ts`

### Required features (both scripts)

**DRY_RUN support:**
- Environment variable `DRY_RUN=1` prints intended changes as a JSON diff per record, without executing writes
- Output format: `[{table, id, field, before, after, operation}]`
- Must execute all SELECT queries to compute diff, but skip all UPDATE/INSERT

**Pre-apply snapshot:**
- Before first write, emit a snapshot JSON of all records being touched (full row, all columns)
- Write to `docs/tmp/retainer-v4-cleanup-pre-apply-snapshot.json`
- On revert, this snapshot can be used to verify reversal completeness

**Batch-tag via `setBatchId()`:**
- Suppresses MCP Slack notifications for cleanup audit rows (per `feedback_skip_slack_publish_cleanup.md`)
- Use a single `batchId` for the entire migration (e.g. `retainer-v4-cleanup-2026-04-21`)

**Pre-apply safety checks** (abort migration if any fail):
1. For each LPPC D.1–D.12 target: verify `updated_at` is either before `2026-04-21T14:00:00Z` OR matches the expected pre-migration state exactly. If any LPPC record has `updated_at > 14:00` AND state doesn't match what we expected, STOP and report which record.
2. For each CREATE L2 (D.3, D.4, D.5): verify no existing L2 with the same title under the same project — avoid duplicate creation on re-run.
3. For Soundly Payment Gateway (A.5): verify `contract_end='2026-05-31'` and `engagement_type='retainer'` before flipping. If state differs, STOP.
4. For the pre-apply snapshot: verify all target records returned (no missing IDs).

**Idempotency:**
- Migration should be safely re-runnable. If re-run after partial success, it should detect already-applied changes and skip them (or STOP with a clear "already applied" message).

**Reverse script:**
- Must restore exact pre-apply state using the snapshot JSON
- For CREATEd records (D.3, D.4, D.5): DELETE by ID (IDs captured in post-apply output)
- For APPEND (D.6): rewrite notes to remove the appended sentence (use a precise `REPLACE` SQL, not string matching — to avoid accidentally removing the wrong content)

### Post-apply verification

After successful apply:
1. Print summary: `N L1 updates, M L2 updates, K L2 creations, 1 notes append. Snapshot at <path>.`
2. Run a verification SELECT against all 31 targets + verify expected post-state
3. Print any discrepancies

---

## Pre-flight for CC

Before running the migration:
1. `pnpm test:run` should pass (baseline)
2. `pnpm lint` should be clean
3. `pnpm build` should succeed
4. Migration script itself should compile (`npx tsx --noEmit scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.ts` OR equivalent typecheck)
5. Write test file: `scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.test.ts` — at minimum tests the diff generation logic in DRY_RUN mode against a known seed dataset

---

## Runbook for operator

**Dry-run against prod Turso (read-only):**
```bash
cd .worktrees/runway-v3-cascade
set -a && source .env.local && set +a
DRY_RUN=1 npx tsx scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.ts
```

**Apply (write to prod Turso):**
```bash
cd .worktrees/runway-v3-cascade
set -a && source .env.local && set +a
npx tsx scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.ts
```

**Revert (if needed, using committed snapshot):**
```bash
cd .worktrees/runway-v3-cascade
set -a && source .env.local && set +a
npx tsx scripts/runway-migrations/retainer-v4-cleanup-2026-04-21-REVERT.ts
```

---

## Handoff notes for new TP after compaction

### What's done before you arrived:
- PR #86 merged to `upstream/runway` (commit `df7cd0f`)
- PR #87 opened + hopefully merged (smoke test typo fix unblocking Vercel deploy)
- Migration spec drafted (this doc) with 31 confirmed changes across 5 clients
- Fresh review agent ran over the spec (look for review doc at `docs/tmp/retainer-v4-cleanup-migration-review.md` if it exists)

### Your immediate tasks:
1. **Verify prod deploy fresh** — confirm `runway.startround1.com` is serving PR #86 code (look for In Flight toggle on This Week view, per `docs/brain/pr86-operator-morning-summary.md`)
2. **Run data sanity pass** — see `docs/tmp/retainer-v4-cleanup-sanity-pass.md` (to be drafted after this). Verify the "Today" and "This Week" views match expected state before migration runs
3. **Review the review** — if the fresh-agent review surfaced issues, triage them with operator. Update spec if needed before firing CC
4. **Fire CC to execute** this spec — with `scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.ts` as the deliverable. Use the existing migration scripts in `scripts/runway-migrations/` as code patterns (see `bonterra-cleanup-2026-04-19.ts` or `convergix-cleanup-2026-04-20.ts` for precedent)
5. **Operator approves dry-run output** before apply
6. **Apply to prod**
7. **Verify via MCP tools** (`mcp__runway__get_projects` etc.) that changes landed correctly

### Known risks:
- **Concurrent Kathy updates:** if Kathy touches any LPPC record between spec-drafting (now) and apply, the pre-apply safety check should catch it. Do NOT override her updates.
- **LPPC `waitingOn` on L2s:** schema may not support this field on week_items. CC should verify during plan mode and adjust D.5 accordingly (include in notes if no field).
- **Record createdAt as startDate proxy (C.1):** Soundly AARP startDate=2026-04-17 is an inference. If Jill later corrects, operator can override.

### What to save as memory when this closes:
- Project-type memory: retainer-v4-cleanup migration applied (date, batchId)
- Feedback memory: any operator-corrected decisions during dry-run review (so next migration doesn't repeat the same inference)

### Future work (next coding PR after this migration):
- Add `parent_project_id` to projects table (retainer wrapper support) — see `docs/brain/future-scheduled-l2-status.md` (mistitled — need new brain doc for wrapper)
- Add explicit `scheduled` L2 status value — see `docs/brain/future-scheduled-l2-status.md`
- Data migration to backfill all existing NULL `week_items.status` → `scheduled`
- Consider dropping legacy `projects.target` column
