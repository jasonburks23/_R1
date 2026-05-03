# Convergix Kathy Cleanup — Batch Plan

**Batch ID:** `convergix-kathy-cleanup-2026-04-22`
**Updated By:** `convergix-kathy-cleanup-2026-04-22-run1` (bump suffix on retry)
**Source of truth for Kathy answers:** `convergix-kathy-replies.md`
**Pre-batch prod state:** `convergix-full-state.txt` (captured 2026-04-22)

## Operator decisions locked this session

1. **Retainer renewal Task (Q5b):** Option B = Task on the Convergix Retainer wrapper (not created yet). Date = 2026-05-25 (Monday of last week of May). Owner + resource = Kathy. **DEFERRED** to wrapper migration post-CC #1 merge. Do NOT add to any existing Project in this batch.
2. **Multiple-blocker notation:** primary in `waiting_on`, others in `notes`.
3. **Rockwell Nicole Task:** add alongside existing `Daniel Scope Ask`, don't replace.
4. **Batching:** single batch, unique `updated_by` per run (append `-runN` on retry).
5. **IVC split:** rename existing in place (preserves id + audit trail). Create new Assembly Project. Move Jamie Nelson Connect. Delete Retainer Period Close.
6. **Brand Guide v2 rename:** strip "(secondary palette)" → `Brand Guide v2`.
7. **Events Page staging Task:** new L2 `Events Page — Staging`; do NOT shift L1 end_date (L1 calcs from L2s, so the staging L2 at 4/30 + existing AISTech at 5/6 = L1 ends 5/6 as-is).
8. **Assembly Project name + metadata:** `Industrial/Battery Assembly Campaign`, status=not-started, category=active, engagement=retainer, contract_start=2026-02-01, contract_end=2026-07-31.
9. **CDS rename target:** `CDS Vertical Campaign`.
10. **Corp Collateral v2026 Live Task:** 2026-06-30 → 2026-05-15 (placeholder per Kathy-said-1-week-post-Daniel + Daniel's observed 2+ week drag).
11. **CDS Brochure + Case Study:** two separate L2 Tasks.
12. **NULL-status reasoning (per row, not blanket):**
    - `Big Win — PPT Template` → `in-progress` (Kathy)
    - `Big Win — Social Announcement Companion` → **DELETE** (Kathy: out of scope)
    - `Corporate Collateral v2026 — Live` → `blocked` (Daniel-blocked)
    - `AISTech 2026` → `scheduled` (future deadline)
    - `Jamie Nelson Connect` → `scheduled` + date update to ~6/1 (Kathy: June-July window); moves to new Assembly Project
    - `Retainer Period Close` → **DELETE** (artificial anchor, no longer needed post-split)
    - `May Content Calendar Draft to Client` → `in-progress` (Kathy actively planning this week)

## L1 recompute rule (CORRECTED after reading ops layer)

**CRITICAL:** L1 `startDate` / `endDate` are NOT in `PROJECT_FIELDS` whitelist. The inline code comment (`operations-utils.ts:325`) states: "startDate / endDate remain derived from children and are recomputed by `recomputeProjectDates`, not set directly here."

**My DRY_RUN script:**
- Never writes `projects.startDate` / `projects.endDate` directly.
- After every L2 change (create, update-to-startDate/endDate, delete, project_id move), calls `recomputeProjectDatesWith(tx, projectId)` inside the same transaction.
- For Task moves: recomputes BOTH source and destination project dates.
- L1 `name`, `notes`, `waitingOn` — written via whitelist-compliant drizzle updates.
- L1 `status` — written via direct drizzle (not in PROJECT_FIELDS, uses separate `updateProjectStatus` code path in ops layer).

## Planned writes — per Project

Listed in logical order (simple status flips first, structural changes last).

### 1. Big Win Template (status flips + delete)
- L2 update: `Big Win Template — PPT Template` (id=9d2f190311c1462797b4761df)
  - `status`: NULL → in-progress
  - `start_date`: 2026-04-24 → 2026-04-22 (Kathy: "going to client today 4/22")
  - `end_date`: NULL → 2026-04-23 (Kathy: target EOD 4/23)
- L2 delete: `Big Win Template — Social Announcement Companion` (id=6a3833a8bad44a6289798b093)
- L1 recompute: start → 2026-04-22, end → 2026-04-23 (unchanged from current).

### 2. Events Page Updates (add staging L2)
- L2 create: `Events Page — Staging`
  - project_id: 135c5a61d5c343b1b5b39fe08
  - category: deadline
  - start_date: 2026-04-30, end_date: 2026-04-30
  - status: scheduled
  - owner: Kathy, resources: "Dev: Leslie"
  - notes: "Staging ready target per Kathy Q1b (2026-04-30). Live-by is AISTech 5/4."
- L1 recompute: start stays 2026-04-23, end stays 2026-05-06 (AISTech still the latest L2).

### 3. Social Content — monthly L1 structure (per operator, deviates from Kathy "one rolling project" but cleaner model)
- L1 rename: `Social Content (12 posts/mo)` (id=f391dff5ceaf45279a807ace9) → `Social Content — April 2026`
  - notes update: "April 2026 content execution under Convergix retainer. 4 posts Week of 4/20 completed 4/27. Monthly cadence: each month gets its own L1 Project through retainer end (2026-07-31)."
  - sort_order: explicit 10 (chronological ordering with new monthly L1s below)
- L1 create: `Social Content — May 2026`
  - status=in-production (Kathy actively drafting May calendar)
  - category=active
  - engagement_type=retainer
  - contract_start=2026-02-01, contract_end=2026-07-31
  - owner=Kathy, resources="CW: Kathy, CD: Lane"
  - notes: "May 2026 content execution under Convergix retainer. May calendar draft due 2026-04-27. Weekly posts through May."
  - sort_order=11
- L1 create: `Social Content — June 2026`
  - status=not-started, category=active, engagement=retainer, contract window same
  - notes: "June 2026 content execution under Convergix retainer. Tasks added as planning develops."
  - sort_order=12
- L1 create: `Social Content — July 2026`
  - status=not-started, category=active, engagement=retainer, contract window same
  - notes: "July 2026 content execution under Convergix retainer. Final retainer month (ends 2026-07-31)."
  - sort_order=13
- L2 update + move: `May Content Calendar Draft to Client` (id=66414d4db2d14fa1aa223bc7e)
  - `status`: NULL → in-progress
  - `project_id`: f391dff5ceaf45279a807ace9 (April L1) → NEW May L1 id
- L1 recompute (multiple):
  - April L1: start → 2026-04-23, end → 2026-04-27 (only Week of 4/20 Task remains after move)
  - May L1: start → 2026-04-27, end → 2026-04-27 (single-day since Draft Task has null end_date; recompute falls back to start as end)
  - June L1: start → null, end → null (no Tasks yet)
  - July L1: start → null, end → null (no Tasks yet)

### 4. Brand Guide v2 — rename + date correction
- L1 update: `Brand Guide v2 (secondary palette)` (id=51f39e5cdfbe446992aa155d6)
  - `name`: "Brand Guide v2 (secondary palette)" → "Brand Guide v2"
  - `notes`: append "Kathy Q5a 2026-04-22: dropping secondary palette from scope; final files to Nicole 2026-04-23."
- L2 update: `Brand Guide v2 — Secondary Palette + Icon Swap` (id=ac4ca38a1de746cfbae01c759)
  - `title`: "Brand Guide v2 — Secondary Palette + Icon Swap" → "Brand Guide v2 — Final Files to Nicole"
  - `status`: blocked → in-progress
  - `start_date`: 2026-04-30 → 2026-04-23
  - `end_date`: NULL → 2026-04-23
  - `notes`: update to "Final files to Nicole 2026-04-23. Secondary palette dropped from scope per Kathy Q5a 2026-04-22. Microsoft icons swap remains."
- L1 recompute: start → 2026-04-23, end → 2026-04-23.

### 5. Certifications Page — notes only (L1 end_date stays 2026-04-23 as honest "blocked since" signal)
- L1 update: `Certifications Page` (id=68a4ee3791b24d72abb5afc62)
  - `notes`: append "Kathy Q2b 2026-04-22: wraps within 1 week of Daniel's cert delivery. End date will be set when Daniel delivers."
- L2 update: `Certifications Page — Daniel Follow-Up` (id=4bdaf887d26f4c9fa0d8a85af)
  - `notes`: append "Per Kathy 2026-04-22: wraps within 1 week of Daniel delivering certs."
- L1 recompute: start stays 2026-04-23 (from L2 startDate). end stays 2026-04-23 via recompute fallback (`end = child.endDate ?? startDate`) since L2 endDate is NULL. This is DATA-HONEST signal: "blocked since 4/23." When Daniel delivers, L2 gets real dates and L1 recomputes forward.

### 6. Corporate Collateral Updates — fix mystery 6/30
- L1 update: `Corporate Collateral Updates` (id=65b2cac113a048f592867a71c)
  - `notes`: append "Kathy Q2b 2026-04-22: brochure + PPT already done, just need cert + Fanuc updates. Launch = Daniel's info + 1 week. 6/30 was a mystery date; replaced with 5/15 placeholder per operator."
- L2 update: `Corporate Collateral v2026 — Live` (id=59726e491993406aae4320049fba2f1a)
  - `status`: NULL → blocked (Daniel-blocked)
  - `start_date`: 2026-06-30 → 2026-05-15
  - `end_date`: 2026-06-30 → 2026-05-15
  - `notes`: "Placeholder end date 2026-05-15 per operator (Daniel-dragging-2+weeks best-guess). Actual = Daniel delivery + 7 days per Kathy Q2b. Flip date when Daniel delivers."
- L1 recompute: start stays 2026-04-30 (earliest L2), end → 2026-05-15 (from v2026 Live).

### 7. Fanuc Award Article + LI Post — 1 week post-4/28 event
- L2 update: `Fanuc Award — Pre-Event Info Ask` (id=13bba3b1b3a043bc8ab63e322)
  - `status`: blocked → completed
  - `notes`: append "Kathy Q1b 2026-04-22: no pre-event ask; Civ has no action until post-event info received. Task closed."
- L2 update: `Fanuc Award — Post-Event Article Kickoff` (id=c1d8bd92710d4ecabde903bf6)
  - `start_date`: 2026-04-30 → 2026-04-29 (day after event)
  - `end_date`: NULL → 2026-05-05 (1 week post-event per Kathy Q2b)
  - `notes`: append "Per Kathy Q2b: 1 week turnaround post-4/28 event. End date 2026-05-05."
- L1 recompute: start stays 2026-04-23, end → 2026-05-05.

### 8. New Capacity (PPT, brochure, one-pager) — add PPT complete L2, flag Daniel
- L1 update: `New Capacity (PPT, brochure, one-pager)` (id=0c208308ff48427092776c0da)
  - `notes`: append "Kathy Q5a 2026-04-22: PPT complete by 5/8 (end of first week May). Brochure + One-Pager parallel tracks post-PPT-lock. Potential Daniel blocker on brochure + one-pager."
- L2 create: `New Capacity PPT — Complete`
  - project_id: 0c208308ff48427092776c0da
  - category: delivery
  - start_date: 2026-05-04, end_date: 2026-05-08
  - status: blocked (blocked on JJ feedback)
  - owner: Kathy, resources: "CD: Lane"
  - notes: "PPT completion milestone. Kathy Q5a: complete by end of first week May. Dependent on JJ feedback landing + final timeline slide."
- L1 recompute: start stays 2026-04-23, end → 2026-05-08.

### 9. AUTOMATE 2026 Booth Design — update L1 notes only
- L1 update: `AUTOMATE 2026 Booth Design` (id=272e7eef7f554c03947d9b103d5dee80)
  - `notes`: append "Kathy Q1c 2026-04-22: formal schedule pending printer dates from show vendor (not yet received). No client-side blocker currently."
- No L2 changes.

### 10. Rockwell Automation Co-Marketing Efforts — add Nicole Task
- L1 update: `Rockwell Automation Co-Marketing Efforts` (id=1923fc1a36524a9c810a73763)
  - `notes`: append "Kathy Q3a 2026-04-22: Nicole to connect with Rockwell + Convergix teams week of 4/28 re: case study lead, timeline, and scope split. Leave active-awaiting-client until that conversation yields more clarity."
- L2 create: `Rockwell Co-Marketing — Nicole Team Conversation`
  - project_id: 1923fc1a36524a9c810a73763
  - category: kickoff
  - start_date: 2026-04-28, end_date: 2026-04-29
  - status: scheduled
  - owner: Kathy, resources: "CW: Kathy"
  - notes: "Kathy awaiting: Nicole to clarify case study lead, timeline, scope split with teams per Q3a."
- L1 recompute: start stays 2026-04-23, end → 2026-04-29 (new Nicole Task).

### 11. Rockwell PartnerNetwork Article — no writes
- Kathy confirmed current state. No changes.

### 12. Texas Instruments Article — TI Page Build end_date + status
- L2 update: `Texas Instruments Award — Page Build` (id=35b86e337b0d4f2b95370bbf9)
  - `status`: blocked → in-progress (page being built; no blocker in notes)
  - `end_date`: NULL → 2026-04-30 (Kathy Q3b: "goal was next status, 4/30")
  - `notes`: append "Kathy Q3b 2026-04-22: goal is next status 4/30."
- L1 recompute: start stays 2026-04-23, end → 2026-05-01 (from existing TI award copy Task).

### 13. Industry Vertical Campaigns → CDS Vertical Campaign (rename + many L2 changes)
- L1 update: id=0e4214c60728476db177f4de1
  - `name`: "Industry Vertical Campaigns" → "CDS Vertical Campaign"
  - `notes`: replace with "CDS vertical campaign post-split from original Industry Vertical Campaigns. Other vertical (Industrial/Battery Assembly) is now its own Project. Kathy Q4a 2026-04-22: different stakeholders, different timelines. Stakeholders: Bob Bove (CDS stakeholder per Q2b), Jared."
  - `waiting_on`: "Jared, Bob" → "Bob Bove" (primary per Kathy Q2b); Jared mentioned in notes.
- L2 delete: `Industry Verticals — Retainer Period Close` (id=456194e50c474995ba12289c47099646)
- L2 move: `Industrial/Battery Assembly — Jamie Nelson Connect` (id=e9f423ef54394ae39b1620d39)
  - `project_id`: 0e4214c60728476db177f4de1 → NEW Assembly Project id
  - `status`: NULL → scheduled
  - `start_date`: 2026-04-23 → 2026-06-01 (June-July window per Kathy Q4b)
  - `notes`: append "Per Kathy Q4b 2026-04-22: open-ended, CDS needs to be further along. Expected June-July kickoff."
- L2 update: `CDS Creative Wrapper` (id=be6c1dbf748445a89d6666eea)
  - `end_date`: 2026-05-07 → 2026-05-14 (matches CDS wrap per Kathy Q4b)
  - `notes`: append "Kathy Q4b 2026-04-22: Lane working today, R1 presentation Wed 2026-04-29."
- L2 update: `CDS Messaging Pillars — R1 Feedback` (id=19f89ecf8b0241e5a4cae45f6)
  - `end_date`: NULL → 2026-05-14 (CDS wrap)
- L2 update: `CDS 3 Landing Pages — Kickoff` (id=813b04a5917a44caa71e4e3bd)
  - `end_date`: NULL → 2026-05-14
- L2 update: `CDS Brochure — Kickoff` (id=46bce31494d146378ef0719db)
  - `title`: "CDS Brochure — Kickoff" → "CDS Brochure (up to 4 pages)"
  - `end_date`: NULL → 2026-05-14
  - `notes`: append "Kathy Q4b 2026-04-22: up to 4 pages. Scope confirmed."
- L2 update: `CDS 5 Social Posts — Kickoff` (id=eaf0ac303eb240a8b2b946443)
  - `end_date`: NULL → 2026-05-14
- L2 create: `CDS Case Study (2 pages)`
  - project_id: 0e4214c60728476db177f4de1
  - category: delivery
  - start_date: 2026-04-30, end_date: 2026-05-14
  - status: blocked (blocked on R1 feedback landing + creative wrapper finalizing)
  - owner: Kathy, resources: "CW: Kathy, CD: Lane"
  - notes: "2-page case study per Kathy Q4b 2026-04-22. Part of CDS vertical scope alongside brochure."
- L1 recompute (post all L2 changes): start stays 2026-04-23, end → 2026-05-14.

### 14. NEW Project: Industrial/Battery Assembly Campaign
- Project create:
  - client_id: convergix id
  - name: "Industrial/Battery Assembly Campaign"
  - status: not-started
  - category: active
  - engagement_type: retainer
  - contract_start: 2026-02-01, contract_end: 2026-07-31
  - owner: Kathy, resources: "CW: Kathy"
  - waiting_on: NULL (no active blocker; sequenced after CDS)
  - notes: "Second vertical campaign post-CDS. Kickoff gated on Jamie Nelson scoping connect. Kathy Q4b 2026-04-22: open-ended, expects June-July start, completion by 2026-07-31. Stakeholders: Bob Bove, Jared."
  - parent_project_id: NULL (wrapper migration deferred to post-CC #1)
  - start_date/end_date: will compute from Jamie Nelson Connect Task after move = start 2026-06-01, end NULL (Task has no end_date). For L1 end_date, set to 2026-07-31 (explicit per Kathy: "completed by 7/31") since Task end is null.

### 15. Pipeline items — no changes this batch
No Convergix Pipeline items in prod currently. No additions (renewal Task deferred to wrapper migration per decision 1).

## Pre-write validators (script-enforced before any write)

1. **Field whitelist grep:** every `field:` name in this plan matches PROJECT_FIELDS / WEEK_ITEM_FIELDS from ops-writes layer.
2. **Status enum check:** every status value in this plan is in the authoritative enum list (projects: in-production|awaiting-client|not-started|blocked|on-hold|completed; week_items: completed|in-progress|blocked|at-risk|scheduled|canceled).
3. **Category enum check:** every category value is in (projects: active|awaiting-client|pipeline|on-hold|completed; week_items: delivery|review|kickoff|deadline|approval|launch).
4. **Engagement enum check:** every engagement_type value is in (project|retainer|break-fix).
5. **batch_id uniqueness:** confirm no existing audit row has this batch_id (fresh batch).
6. **updated_by uniqueness:** confirm no existing audit row has this updated_by (bump suffix if retry).
7. **id existence:** every row targeted by update/delete/move exists in prod (matches pre-batch snapshot).

## Audit trail (one `updates` row per affected row)

For each create/update/delete/move, insert an `updates` row with:
- idempotency_key: `${BATCH_ID}:${update_type}:${target_id}[:${field}]`
- project_id: affected Project (or new Project id on creates)
- client_id: convergix id
- updated_by: UPDATED_BY constant
- update_type: e.g., `project.rename`, `week_item.status_change`, `week_item.create`, `week_item.delete`, `week_item.move`
- previous_value: JSON of before state
- new_value: JSON of after state
- summary: human-readable one-liner
- batch_id: BATCH_ID
- created_at: unix seconds (schema expects seconds per `{ mode: "timestamp" }`)

## Post-APPLY verification (run after successful APPLY)

1. Re-run `convergix-full-state.ts` and diff against pre-batch snapshot. Diff should match this plan exactly.
2. Count `updates` rows with this batch_id — should equal total write ops.
3. Confirm no `updates` rows with this batch_id have created_at > 9999999999 (catches the ms-encoding bug).
4. Confirm new Assembly Project has exactly 1 child Task (Jamie Nelson Connect) after move.
5. Confirm CDS Vertical Campaign has 0 orphan Tasks.
6. Confirm no Convergix week_items have NULL status (all resolved).
