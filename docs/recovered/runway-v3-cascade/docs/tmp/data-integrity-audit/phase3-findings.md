# Phase 3 findings — 12 non-Convergix accounts

**Purpose:** Compact per-client summary of data gaps surfaced by the 2026-04-22 audit. Use this when Kathy's replies land so the data-write plan can be generated without re-auditing. Paired with `phase3-audit-report.txt` (raw per-client L1+L2 dump).

## Cross-cutting gaps (recurring patterns)

1. **Stale pipeline rows alongside signed work.** Bonterra Impact Report SOW $55K is `at-risk` while the Project is in-production under a signed contract. Soundly AARP $31.4K pipeline item is `at-risk` waiting-on Soundly-to-sign but the note says SOW signed. Both look like artifacts from contract signing that the pipeline row didn't get cleared on. **Write plan when confirmed:** delete or mark completed in `pipeline_items`.

2. **NULL engagement_type across 13 Projects.** All 9 BP L1s + singletons on ABM, AG1, EDF, Wilsonart. ABM/AG1/EDF pre-contract so NULL is fine. Wilsonart and all BP need `engagement_type` set. **Likely writes:** BP → `retainer` under the MSA (or selectively `project` for the SOWs), Wilsonart → `project`.

3. **No Tasks on active Projects.** ABM, AG1, Soundly AARP, Hopdoddy Digital Retainer, all 9 BP L1s, Wilsonart — all in-production or active with zero week_items. These are the largest data-surface gaps; most of Kathy's Q&A answers will result in creating Tasks here.

4. **"This week" / "mid-summer" / "TBD" date phrases in notes with no real end_date.** Wilsonart Chester Videos, BP Hopkins Research, Hopdoddy Digital Retainer. Need concrete dates to backplan.

## Per-client — what would change when answered

### ABM
- **Q1 confirms:** status accuracy (in-production seems wrong for pre-contract RFP), whether to add Tasks for 4/29 notification + potential 5/4 or 5/11 presentations. Contract value entry for $2.5M-$2.8M scope.
- **Write surface:** project status flip possibly, create 1-3 Tasks, possibly set contract_value.

### AG1
- **Q1 confirms:** project status (not-started seems wrong after 4/18 delivery of 6 cuts), structure (1 Project vs batched Tasks for remaining 19), next deliverables.
- **Write surface:** status flip to in-production, create Tasks.

### Beyond Petrochemicals (biggest write surface)
- **Q1 (structure):** whether MSA projects stay as one engagement_type='retainer' set, or split into retainer (MSA monthly work) vs project (pipeline SOWs when signed). **Pipeline item for "Contract 2H"** — add if confirmed.
- **Q2-Q5 (per-Project):** set engagement_type + create Tasks on Organic Social, Hopkins Research, Know Your Neighbor target date, Fact Sheets completion check.
- **Q6 (five extra prod projects not on hot sheet):** each gets decision (keep + fill in, or delete as stale). Two .org maintenance Projects are recurring monthly work.
- **Q7 (pipeline):** 4 SOW-sent items waiting on Matt. Each signature = convert to a Project (or the operator-decided auto-convert flow).
- **Write surface:** set engagement_type × 9, create Tasks × many, potentially delete 1-5 projects, add 1 pipeline row, set dates on 9 Projects. Largest client touch in this phase.

### Bonterra
- **Q1 confirms:** 3 no-status Tasks (Internal Review 4/23, Dev Handoff 4/28, Go Live 5/11) → status flips. Clear the at-risk pipeline row.
- **Write surface:** 3 week_item status flips + 1 pipeline delete.

### Dave Asprey
- **Q1 confirms:** 2 no-status Tasks flip to in-progress, whether a closeout Task is needed post-4/30.
- **Write surface:** 2 week_item status flips, possibly add 1 Task for final invoice/breakup, Project auto-completes when retainer ends.

### EDF
- **Q1 confirms:** status accuracy (not-started with no scope) — likely should be on-hold or deleted.
- **Write surface:** status change or Project delete.

### High Desert Law (HDL)
- **Q1 (critical):** contract extension status. If not extended, major business conversation before any Runway writes. Other questions: 4/24 delivery, June shoot date, 6/30 at-risk.
- **Write surface:** likely minimal data changes (the 11 Tasks are already well-structured), mostly status progression over next weeks. Contract_end may need extension date if new SOW.

### Hopdoddy (Dottie)
- **Q1 (Brand Refresh):** 4/30 launch firm? status flip on launch Task. Intermediate Tasks?
- **Q2 (Digital Retainer):** empty Project needs Tasks. "Breakup in summer" plan — end_date? Breakup Task?
- **Write surface:** 1-2 status flips on Brand Refresh, 2-5 new Tasks on Digital Retainer, possibly set end_date on Digital Retainer to a summer date.

### LPPC
- **Q1 (Website Revamp):** R3 feedback status, Lane's Figma progress, Bill photo/video timeline, Matt advocacy delivery. Multiple status flips on in-progress Tasks.
- **Q2 (Interactive Map):** 3 no-status Tasks flip to in-progress.
- **Q3-Q6:** status confirmations on on-hold/completed Projects. Possible delete/complete on blog posts + mailchimp.
- **Write surface:** 4-8 week_item status flips, possibly 1-2 Project status changes.

### Soundly
- **Q1 (AARP):** clear stale pipeline row, add Tasks. Launch confirm.
- **Q2 (Payment Gateway):** possibly add sub-Tasks.
- **Q3 (iFrame):** likely flip to completed today if it launched. Possible Project complete.
- **Write surface:** 1 pipeline delete, 3-6 new Tasks, 1-2 Project status changes.

### TAP
- **Q1 confirms:** whether to backfill pre-Dev phases as historical Tasks, whether to set contract_value.
- **Write surface:** maybe 3 backfilled Tasks (Discovery, SRD, DB Design as completed), 1 contract_value set.

### Wilsonart
- **Q1 confirms:** actual end_date, scope of Friday call (separate Project?), engagement_type.
- **Write surface:** set end_date, set engagement_type='project', possibly create 1 Task for graphics work or spin new Project.

## Batch-hygiene plan when writes begin

Per `feedback_mcp_batch_hygiene.md` and the Convergix playbook:
- **One batch_id per client.** Proposed pattern: `phase3-<client-slug>-2026-MM-DD`.
- **DRY_RUN script first**, operator review, then APPLY.
- **Unique `updated_by`** per attempt — if revert-retry, bump suffix (`-retry`) so idempotency keys don't poison.
- **Field whitelist grep** before each APPLY: PROJECT_FIELDS + WEEK_ITEM_FIELDS constants.
- **Re-pull snapshot** between clients if work spans multiple sessions — Runway is actively edited by Kathy.
- **Skip Slack publish** on cleanup batches per `feedback_skip_slack_publish_cleanup.md`.

## Ordering when replies land

Suggested order (lowest-risk → highest-risk):
1. **Simple status flips** (Bonterra, Dave Asprey, LPPC open Tasks, Hopdoddy Brand Refresh launch) — small batches, low write count.
2. **Stale pipeline cleanups** (Bonterra at-risk SOW, Soundly AARP at-risk) — single-row pipeline deletes.
3. **Wilsonart + EDF** — small decisions about status/delete.
4. **TAP backfill** — small, additive, historical only.
5. **Beyond Petro** — largest batch, most Project changes. Do last so prior batches don't interfere.
6. **Convergix Q1-Q5 replies** — merged into this ordering wherever Kathy's answers land first.

## What NOT to do until confirmed

- Don't delete any Project or week_item without explicit per-op approval (even ones I think are stale).
- Don't set engagement_type without Kathy confirming the BP modeling.
- Don't touch HDL dates until the contract-extension question resolves.
- Don't rename "Partner-of-Year image swap" leftovers — already handled in Kathy's 15:01 batch.
