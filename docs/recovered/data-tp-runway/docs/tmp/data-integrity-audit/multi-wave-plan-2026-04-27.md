# Data TP Multi-Wave Plan — 2026-04-27

**Status:** Draft. Pre-compaction artifact. Post-compact, read this FIRST before touching prod.

**Source doc:** Google Doc `1QyslZZPagrq81a-v6Xmz5oj1fgsLhfl9CG89CMYb_ms` ("Data Integrity — Other Account Questions") with answers from Kathy Horn, Jill, Jason Burks, and Allison.

**Worktree:** `.worktrees/data-tp-runway` on `feature/data-tp-cluster3` (based on upstream/runway). Tossable when waves complete.

**Critical post-compact facts (do NOT re-derive):**
- Cluster 3 ALREADY APPLIED 2026-04-26. Wrapper id `4171aa4d88934d22b020d75fe` has the `2H Convergix Retainer Renewal` Task at weekOf=2026-05-25, recompute guard live-validated.
- Phase 3 was originally scoped to 17 NULL-status L2s. The doc broadened scope significantly. This plan covers the broader scope across 6 waves.
- All waves are DATA-only. No PRs needed. `pnpm runway:migrate` against prod.
- Schema: `clients.contractValue` exists (text, format `"$N,NNN"`). `projects` has NO contractValue field. `pipeline_items.estimatedValue` exists.

**State as of 2026-04-27 compaction:**
- LPPC Phase 3 checklist sent to Kathy (10 Tasks). Awaiting reply. Sent text in conversation history. Re-pull in DRY_RUN if needed.
- HDL prod state pulled (see HDL section below). Operator promised a new schedule to drive HDL updates — wait for that artifact before drafting Wave A HDL changes (HDL is NOT in original Phase 3 — it's a separate ad-hoc batch).
- Convergix morning updates by Kathy (2026-04-27 14:23-14:26 UTC) confirmed zero overlap with any wave row. Wrapper still has 16 children (12 active, 4 newly-completed-but-still-parented). Cluster 3 still standing.
- Pre-check approach correction: drop "no audit rows since snapshot" check. Use per-row optimistic-concurrency check instead (capture `updated_at` at pre-check, compare at write).

---

## Wave summary table

| Wave | Scope | Approx writes | Helper(s) | Risk | Decision-density |
|---|---|---|---|---|---|
| A | Phase 3 — L2 status flips | ~13–17 | `updateWeekItemField`, direct drizzle for date+weekOf composite | Low | Per-row at DRY_RUN |
| B | Project lifecycle changes | ~7 | `updateProjectStatus`, `updateProjectField` | Medium | LPPC holdover Projects: cancel vs delete vs on-hold |
| C | Contract / structural updates | ~3 | `updateClientField` (contractValue) | Low | Whether to bump HDL/Hopdoddy contractValue or treat as separate |
| D | New rows | ~10+ | `createWeekItem` | Medium | AG1 batch structure, ABM Task shapes |
| E | Pipeline at-risk cleanup | 2 | `updatePipelineItem` | Low | Final status (won? in-progress? new value?) |
| F | Team-member maintenance | 1 | `updateTeamMember` | Low | Confirm Paige's full departure scope |

Total: ~35–40 audit rows across all waves.

---

## Open questions for operator (resolve before any APPLY)

1. **Wave A — LPPC Q1 Website Revamp Tasks.** Kathy's answers confirm dates ("feedback by 4/23, photos by 4/24, Matt by 4/24") but don't explicitly say "flip to in-progress." Read as implicit flip, or hold for explicit per-row sign-off?

2. **Wave A — Bonterra Q1 Tasks (Internal Review 4/23, Dev Handoff 4/28).** Kathy "unsure" on both. Default: leave at NULL. Confirm.

3. **Wave B — LPPC holdover Projects (MyLPPC Training Video, Website Blog Posts, Mailchimp Invites).** Both Kathy and Jill don't recognize them; Jill: "holdover from prior retainer." Three handling options:
   - (a) Mark `status="canceled"` — preserves history, signals dead
   - (b) Mark `status="on-hold"` — preserves history, signals dormant (more conservative)
   - (c) `deleteProject` — removes the row entirely (loses history; cascading delete on child WIs)
   - **Recommendation:** (a) canceled. Rationale: they're explicitly declared not-current-scope. on-hold implies "we'll come back" which neither lead intends.

4. **Wave C — HDL +$7,400 supplemental SOW.** Jill: "I just sent them an SOW for $7400 which was signed." Three handling options:
   - (a) Bump HDL `contractValue` from current value (need to check) by $7,400
   - (b) Add a new pipeline item rep'g the supplemental
   - (c) Note in HDL Project notes only
   - **Recommendation:** (a) bump contractValue + add note line for traceability.

5. **Wave C — Hopdoddy $14,800 brand-refresh incremental.** Jill: "$14,800 has been/will be billed separately." Hopdoddy `contractValue=$38,000` currently.
   - Same 3-option pattern as HDL.
   - **Recommendation:** (b) leave contractValue at $38,000 (the core), add a pipeline item for the brand refresh — tracks separately as Jill described.

6. **Wave D — AG1 batch structure.** Jill provided full Batch 1 + Batch 2 timeline (8 dated milestones). Two structuring options:
   - (a) Single Project "Social Content Trial" (existing) with each milestone as a Task
   - (b) Two child Projects (Batch 1, Batch 2) with milestone Tasks under each
   - **Recommendation:** (a) — these are batches within one trial, not separate engagements.

7. **Wave F — Paige scope.** Kathy: "Paige is no longer on the team." Two interpretations:
   - (a) Paige left the agency entirely → `team_members.is_active=0`
   - (b) Paige rolled off Bonterra specifically → remove "bonterra" from her `accounts_led` JSON array
   - Need confirmation. Default lean: (a).

---

## Wave A — Phase 3 (L2 status flips)

**Filename:** `phase3-l2-status-flips-2026-04-27.ts` (+ `-verify` + `-REVERT`)
**Batch ID:** `phase3-l2-status-flips-2026-04-27`

### Per-row plan

| # | Client | Project | WI title | weekOf | Current | New | Source |
|---|---|---|---|---|---|---|---|
| 1 | LPPC | Interactive Map | Dev Revisions | 2026-04-20 | null | in-progress | Kathy: "Yes, flip" |
| 2 | LPPC | Interactive Map | Present Revised Map | 2026-04-20 | null | in-progress | Kathy: "Yes, flip" |
| 3 | LPPC | Interactive Map | Launch | 2026-04-27 | null | in-progress | Kathy: "Yes, flip" |
| 4 | LPPC | Website Revamp | R3 Feedback (or eq.) | 2026-04-20 | null | in-progress | Implicit from Kathy "awaiting feedback by 4/23" — operator confirm needed |
| 5 | LPPC | Website Revamp | LPPC Images Due | 2026-04-20 | null | in-progress | Kathy: "they will deliver by 4/24" |
| 6 | LPPC | Website Revamp | Advocacy Articles + Tags Due | 2026-04-20 | null | in-progress | Kathy: "they will deliver by 4/24" |
| 7 | Soundly | iFrame Provider Search | (only no-status WI) | varies | null | completed | Jill: "Leslie pushed live yesterday evening" |
| 8 | Hopdoddy | Brand Refresh Website | Launch | 2026-04-27 | null | scheduled | Jill: launch pushed to 5/18-19; need to update weekOf, dayOfWeek |
| 9 | Dave Asprey | Social Retainer — Wind Down | Disconnect Google Sheet from ManyChat | 2026-04-27 | null | in-progress | Allison handles 4/29; flip to in-progress |
| 10 | Dave Asprey | Social Retainer — Wind Down | Final Post (4/30) | 2026-04-27 | null | in-progress | Final Post imminent |
| 11 | Bonterra | Impact Report | Internal Review (4/23) | 2026-04-20 | null | **HOLD** | Kathy "unsure" |
| 12 | Bonterra | Impact Report | Dev Handoff (4/28) | 2026-04-27 | null | **HOLD** | Kathy "unsure" |
| 13 | Bonterra | Impact Report | Go Live (5/11) | 2026-05-11 | null | scheduled | Jill: "on schedule, will deliver all on 4/28; Launch 5/11" |

### Hopdoddy Launch Task — special handling

Row 8 needs a date update PLUS a weekOf shift (4/30 → 5/18 or 5/19 — operator pick the day at DRY_RUN). Operations:
- Update `weekOf` from `2026-04-27` to `2026-05-18`
- Update `dayOfWeek` from current to "monday" or "tuesday" (operator pick)
- Update `date` if currently set
- Update `status` from null to "scheduled"
- All audit-tagged in same batch row (or 4 audit rows if helpers split fields — likely 4)

### Pre-checks for Wave A

1. Each target WI exists at the expected (clientId, projectId, weekOf, title) coordinates
2. Each target WI has `status = NULL` currently (drift detection)
3. No new audit rows since last snapshot (drift sniff)

### Helpers
- Status flips → `updateWeekItemField` (status is in WEEK_ITEM_FIELDS whitelist)
- Hopdoddy date+weekOf+dayOfWeek + status → 4 calls to `updateWeekItemField` OR direct drizzle in a transaction

### Skip Slack publish?
Per `feedback_skip_slack_publish_cleanup.md`, cleanup batches don't get published. Wave A is mostly status flips that staff already know about (these are working tasks). My lean: **skip publish** — staff already see these in their normal cadence. Operator confirm.

---

## Wave B — Project lifecycle changes

**Filename:** `project-lifecycle-cleanup-2026-04-27.ts` (+ `-verify` + `-REVERT`)
**Batch ID:** `project-lifecycle-cleanup-2026-04-27`

### Per-row plan

| # | Client | Project | Current status | New status | Reason |
|---|---|---|---|---|---|
| 1 | LPPC | MyLPPC Training Video | on-hold | canceled (recommendation) | Both Kathy + Jill: "I don't know what this is" / "holdover from prior retainer" |
| 2 | LPPC | Website Blog Posts | on-hold | canceled | Kathy: "not part of current scopes"; Jill: "holdover" |
| 3 | LPPC | Mailchimp Invites (Spring + Fall) | on-hold | canceled | Same as above |
| 4 | LPPC | 2025 Year End Report | completed | (verify still completed, no-op) | Already closed per Kathy/Jill |
| 5 | LPPC | Spring CEO Meeting Invite | completed | (verify still completed, no-op) | Already closed |
| 6 | Soundly | Payment Gateway Page | in-production | completed | Jill: "Leslie pushed this live yesterday evening" |
| 7 | Soundly | iFrame Provider Search | in-production | completed | Jill: pushed live; pairs with Wave A row 7 |
| 8 | Wilsonart | Chester Videos | in-production | completed | Operator: "Done — Call it finished" |
| 9 | EDF | TBD — Work may pick up w/o 4/13 | not-started | on-hold | Kathy: "this should go on-hold until we hear back from client" |

### Pre-checks
1. Each target Project exists with expected current status
2. For the 3 LPPC holdovers: confirm child WI count (deleting/canceling Project with active children is risky)
3. Capture `contractValue` and other unrelated fields for REVERT

### Helpers
- Status changes → `updateProjectStatus` (handles auto-cascade + audit)

### Slack publish?
**Yes, publish.** Project lifecycle changes are substantive. Staff should see them.

---

## Wave C — Contract / structural updates

**Filename:** `contract-updates-2026-04-27.ts` (+ `-verify` + `-REVERT`)
**Batch ID:** `contract-updates-2026-04-27`

### Per-row plan

| # | Client | Field | Current | New | Source |
|---|---|---|---|---|---|
| 1 | TAP | contractValue | null | "$120,000" | Jason: "The contract value is $120,000" |
| 2 | HDL | contractValue | (verify at DRY_RUN) | (current + $7,400) | Jill: "$7,400 SOW signed" — pending operator decision per Open Q4 |
| 3 | (skipped) | Hopdoddy contractValue | $38,000 | $38,000 | Per Open Q5 recommendation: leave; track $14,800 as pipeline (slides into Wave D or a separate Wave G — pipeline-create) |

### Helpers
- Client field updates → `updateClientField`

### Note
TAP is the simplest. HDL needs operator's Open Q4 answer. Hopdoddy might exit Wave C entirely.

---

## Wave D — New rows

**Filename:** `new-rows-2026-04-27.ts` (+ `-verify` + `-REVERT`)
**Batch ID:** `new-rows-2026-04-27`

### Per-row plan (subject to operator confirmation per row)

| # | Client | Project | Title | weekOf | Status | Notes |
|---|---|---|---|---|---|---|
| 1 | ABM | RFP Response | Shortlist Notification Received | 2026-04-20 | completed | Kathy: notice received 4/22; flip to completed since it happened |
| 2 | ABM | RFP Response | Presentation 5/8 3pm EST | 2026-05-04 | scheduled | Kathy: confirmed 5/8 |
| 3 | Dave Asprey | Social Retainer — Wind Down | Content Drive Folder + Calendar Handoff | 2026-04-27 | scheduled | Allison: handles on 4/30 |
| 4 | AG1 | Social Content Trial | Batch 1 — Files Due | 2026-04-27 | in-progress | Jill: Batch 1 final tweaks |
| 5 | AG1 | Social Content Trial | Batch 2 Concept Write-ups Due | 2026-04-27 | scheduled | Jill: 4/28 |
| 6 | AG1 | Social Content Trial | Batch 2 R1 Statics/Graphic Posts Due | 2026-04-27 | scheduled | Jill: 5/1 |
| 7 | AG1 | Social Content Trial | Batch 2 Potential Shoot | 2026-05-04 | scheduled | Jill: 5/4 |
| 8 | AG1 | Social Content Trial | Batch 2 R1 Video Posts Due | 2026-05-04 | scheduled | Jill: 5/8 |
| 9 | AG1 | Social Content Trial | Batch 2 All Finals Due | 2026-05-11 | scheduled | Jill: 5/15 (target) |

### AG1 status flip
Wave D should also include flipping AG1 Social Content Trial Project from `not-started` → `in-production` (per Jill's "we kicked off batch 2 today"). Bundle into this wave's batch.

### Hopdoddy bonus
Possibly add intermediate Tasks between now and the new launch date (final QA, client sign-off, staging push) per the original Q1.2 question. Operator answer wasn't explicit; my lean: **skip** unless operator pushes for them.

### Helpers
- New WIs → `createWeekItem`
- AG1 Project status → `updateProjectStatus`

### Slack publish?
**Yes, publish.** New work landing on multiple plates.

---

## Wave E — Pipeline at-risk cleanup

**Filename:** `pipeline-cleanup-2026-04-27.ts` (+ `-verify` + `-REVERT`)
**Batch ID:** `pipeline-cleanup-2026-04-27`

### Per-row plan

| # | Pipeline item | Current | New | Source |
|---|---|---|---|---|
| 1 | Bonterra "Impact Report SOW" $55K | at-risk | (operator pick: won? signed? in-progress? — depends on pipeline status enum) | Kathy: "not at risk, SOW is signed" |
| 2 | Soundly "AARP Member Login + Landing Page" $31.4K | at-risk | (operator pick) | Note: SOW per Jill is signed; this row may be redundant with the existing Soundly Project |

### Open call needed
Need operator to confirm valid pipeline_item.status enum values AND choose new status for each. Probably "in-progress" (work happening) or some "signed/won" terminal state. I'll grep enum at DRY_RUN time and surface options.

### Helpers
- `updatePipelineItem` (status is in PIPELINE_ITEM_FIELDS)

### Slack publish?
**Skip.** Pipeline state changes are operational hygiene, not staff-facing work events.

---

## Wave F — Team member maintenance

**Filename:** `team-member-cleanup-2026-04-27.ts` (+ `-verify` + `-REVERT`)
**Batch ID:** `team-member-cleanup-2026-04-27`

### Per-row plan

| # | Team member | Field | Current | New |
|---|---|---|---|---|
| 1 | Paige | is_active | 1 | 0 (per Open Q7 lean) |

### Pre-checks
Surface Paige's current accounts_led + active status at DRY_RUN. Operator confirms (a) full departure or (b) Bonterra-only roll-off.

### Helpers
- `updateTeamMember`

### Slack publish?
**Skip.** Personnel data hygiene.

---

## Sequencing + dependencies

**Recommended order:**

1. **Wave A first.** Tightest scope, mostly clear answers. Phase 3 was the original ask.
2. **Wave B.** Builds on A — Project completed flips for Soundly Payment Gateway + iFrame pair with the WI completed flips in A.
3. **Wave E.** Quick pipeline cleanup; depends on nothing.
4. **Wave C.** Contract values; depends on operator answers to Open Q4 / Q5.
5. **Wave D.** New rows; depends on operator confirmations on AG1 batch structure (Open Q6) and ABM Task shapes.
6. **Wave F.** Personnel hygiene; depends on Open Q7 confirmation.

**Could parallelize:** A + E + F are independent of each other; could batch-fire sequentially in the same session without operator gates between.

**Hard dependencies:**
- D row 1 (ABM shortlist completed) must come AFTER B confirmation that ABM Project is in expected shape
- B row 7 (Soundly iFrame Project completed) should come AFTER A row 7 (the WI completed) — same idea: Project completes after its last WI completes

---

## Helper coverage matrix

| Operation | Helper | Status |
|---|---|---|
| L2 status flip | `updateWeekItemField` | ✓ |
| L2 weekOf + dayOfWeek + date update | `updateWeekItemField` × N (or direct drizzle in tx) | ✓ |
| Project status flip | `updateProjectStatus` | ✓ |
| Project field update (notes etc) | `updateProjectField` | ✓ |
| Client contractValue update | `updateClientField` | ✓ |
| Pipeline status update | `updatePipelineItem` | ✓ |
| Team member is_active update | `updateTeamMember` | ✓ |
| New WI creation | `createWeekItem` | ✓ (also tested live in Cluster 3) |

**No code changes needed for any wave.** All helpers exist in upstream/runway.

---

## Snapshot strategy

`pnpm runway:migrate --apply` auto-snapshots before each batch via `pnpm runway:pull`. The snapshot becomes a per-batch revert anchor, separate from per-script REVERT files.

Each wave has its own `-REVERT` script for fast rollback if post-write checks fail.

---

## Decision-gate map (when I need to ask the operator)

| Gate | What | When |
|---|---|---|
| Wave A DRY_RUN review | Per-row status flips + Hopdoddy date update | Before Wave A APPLY |
| Open Q1 | LPPC Q1 implicit-flip read | Before Wave A APPLY |
| Open Q2 | Bonterra "unsure" hold | Before Wave A APPLY |
| Open Q3 | LPPC holdover handling | Before Wave B APPLY |
| Open Q4 | HDL contract bump | Before Wave C APPLY |
| Open Q5 | Hopdoddy incremental | Before Wave C APPLY |
| Open Q6 | AG1 batch structure | Before Wave D APPLY |
| Open Q7 | Paige scope | Before Wave F APPLY |
| Pipeline status enum | Wave E confirms valid enum values | Before Wave E APPLY |
| Skip-publish-Slack confirm | Per-wave | Before each `runway:publish-updates` call |

---

## Post-compact rehydration checklist

1. Read this file (multi-wave-plan-2026-04-27.md)
2. Read auto-memory MEMORY.md → project_pr89_pr90_pr91_in_flight.md → project_convergix_cleanup_applied.md
3. Confirm Cluster 3 audit row exists: `SELECT * FROM updates WHERE batch_id = 'convergix-retainer-renewal-task-2026-04-26'`
4. Confirm worktree state: `.worktrees/data-tp-runway`, branch `feature/data-tp-cluster3`
5. Confirm no audit rows have landed since the last batch (`SELECT MAX(created_at) FROM updates`)
6. Resolve open questions Q1–Q7 with operator
7. Start Wave A draft → DRY_RUN → APPLY

---

---

## HDL state snapshot (pulled 2026-04-27)

**Use case:** Operator handed the HDL schedule conversation pre-compaction. Use this snapshot + the schedule artifact (operator will provide post-compaction) to draft an HDL-specific batch. HDL is NOT part of Wave A Phase 3 — it's a separate ad-hoc batch (call it Wave G or fold into Wave C as schedule warrants).

**Client record (slug=`hdl`, id=`9c43ae144b684a1dad702d44c`)**
- contract_value = `$73,000`
- contract_term = `Aug 22, 2025 – Jan 31, 2026`
- contract_status = `expired`
- team = `AM: Jill, CD: Lane, Dev: Leslie, PM: Jason`
- contacts = Chris (Copywriter), Jamie Lincoln (Ad Words)

**Project: Website Build** (only project)
- status: in-production / category=active / engagement_type=project
- contract_start/end on Project: null/null (using client-level fields)
- derived dates: 2026-04-24 .. 2026-06-30
- owner = Jill, resources = AM: Jill, CD: Lane, Dev: Leslie, PM: Jason
- notes (truncated): "14-phase website build for High Desert Law. Site Copy delivered (Chris unblocked). Full Site Design in-progress with Lane, target Fri 4/24. Dev starts Mon 4/27 with Leslie. Photo shoot slipped May → J..."

**Pipeline items: 0**

**Tasks (11)**

| weekOf | day | Title | Status | start..end |
|---|---|---|---|---|
| 2026-04-20 | Fri | Full Site Design — Civ Delivers | in-progress | 4/24..4/24 |
| 2026-04-27 | Mon | Full Site Design Approval | blocked | 4/27..null |
| 2026-04-27 | Mon | Start Development | blocked | 4/27..null |
| 2026-05-04 | Mon | Schema/SEO/AIO | blocked | 5/4..null |
| 2026-05-11 | Mon | Ad Words | blocked | 5/11..null |
| 2026-05-18 | Mon | Photo Shoot Prep | blocked | 5/18..null |
| 2026-05-18 | Mon | Smokeball Integration | blocked | 5/18..null |
| 2026-06-01 | Mon | Domain/URL + Webflow | blocked | 6/1..null |
| 2026-06-08 | Mon | Site Staging | blocked | 6/8..null |
| 2026-06-15 | Mon | Production Shoot | blocked | 6/15..null |
| 2026-06-29 | Tue | Site Live | blocked | 6/30..null |

**Likely changes from Jill's answers (per `Other Account Questions for Data Integrity` doc):**

1. `contract_value`: $73,000 → $80,400 (bump for $7,400 supplemental SOW Jill signed)
2. `contract_status`: expired → signed
3. `contract_term`: needs new end date (Jill said end pushed but didn't specify; operator may have it from the schedule)
4. Production Shoot weekOf: 6/15 → 6/1 (Jill: w/o 6/1 in Bend; Lane and/or Kathy attend)
5. Photo Shoot Prep weekOf: 5/18 → 5/25 or aligned to new 6/1 shoot
6. Notes refresh: Lane on design + $7,400 supplemental + 6/1 shoot

**Wait on operator's schedule artifact before locking the change list.** They flagged "I'll show you a schedule to help line out this project" — that schedule may shift dates beyond just Photo Shoot Prep.

---

## Throwaway clean-up after waves

When all waves complete:
- `git worktree remove .worktrees/data-tp-runway` (operator runs)
- Delete `feature/data-tp-cluster3` branch
- Future Data TP work creates a fresh worktree with a relevant name

End of plan.
