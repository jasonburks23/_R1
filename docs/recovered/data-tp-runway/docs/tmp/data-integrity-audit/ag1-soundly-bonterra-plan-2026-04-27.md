# AG1 + Soundly + Bonterra Cleanup — 2026-04-27

**Status:** Plan drafted, operator-confirmed values. Three corrections applied 2026-04-28 (fresh-eyes review): Bonterra Dev Handoff category change, AG1 Social Content Trial engagementType, multi-field ordering callout. Triplet still to be drafted; THEN DRY_RUN.

**Batch ID:** `ag1-soundly-bonterra-cleanup-2026-04-27`

**Trigger:** Three deltas surfaced today (2026-04-27):
- AG1: Allison created PRO Content Project + Concept Writeups Task with status=null + non-standard resources string ("Sami, Lane" instead of "CM: Sami, CD: Lane"). Project was created flat; per operator should nest under Social Content Trial wrapper.
- Soundly: Pipeline_item AARP $31.4K still at-risk + waitingOn "Soundly to sign" — but the AARP Project is already in-production with notes "SOW signed and kicked off." Pipeline_item is stale. Plus Payment Gateway "In Dev" Task (4/23, status=null) red zone.
- Bonterra: Jill's Slack convo with operator confirmed Internal Review (4/23) happened + Final Review (4/29) + Deliver to Client (4/30) + Go Live (5/11, possibly 5/13). She created the new Tasks but didn't flip the existing nulls. Dev Handoff (4/28) doesn't fit her flow → rename + convert to range "Dev IR Revisions 4/23-4/29".

## Audit-row estimate: 22 rows (revised 2026-04-28 after dropping Soundly Payment Gateway)

Per-helper breakdown (drafter, confirm via post-write assertion):

**`updateProjectField`** — 4 rows:
- AG1 Social Content Trial: engagementType (added 2026-04-28), notes
- AG1 PRO Content: parent_project_id, notes

**`updateWeekItemField`** — 17 rows:
- AG1 Concept Writeups: resources, status (2)
- Bonterra Internal Review: status, notes (2)
- Bonterra Dev Handoff → Dev IR Revisions: category, title, date, startDate, endDate, weekOf, dayOfWeek, status, notes (9)
- Bonterra Go Live: status, notes (2)
- Soundly Payment Gateway: status (1) — flagged as assumption (open Q below)

**`updatePipelineItem`** — 1 row (Soundly AARP: status + waitingOn + notes — drafter to verify whether helper writes one combined audit row or per-field; if per-field, total grows by 2)

**Per-client subtotals:**

| Client | Audit rows |
|---|---|
| AG1 | 6 (4 project-field + 2 week-item-field) |
| Soundly | 2 + 1 (1 pipeline + 1 week-item-field; pipeline could be 3 if per-field) |
| Bonterra | 13 (all week-item-field) |

**Total: 22 audit rows under batch_id** (24 if pipeline helper writes per-field).

## Per-client write spec

### AG1 (slug `ag1`, client_id `3d32435a5d854144a7272150c`)

**Project: Social Content Trial** (`6aba81214dd5495fb5b08cd2f`) — wrapper
- `engagementType`: null → `retainer` *(added 2026-04-28 — required for wrapper guard at operations-writes-week.ts:101 to fire and pin Social Content Trial as a SOW window rather than recomputing dates from L2 children)*
- `notes`: "30-day trial. 5-7 posts/week, possibly clipping work. Verbal, SOW being drafted." → "30-day trial, ~25 content pieces total. Batch 1 (6 Hugh Content pieces) completed. Batch 2 = AG1 PRO Content (concepting; est 5-6 pieces of 19 remaining) nested as child Project. Verbal SOW; formal $30K SOW being drafted (see pipeline)."

**Project: AG1 PRO Content** (`92708ffc4cbd4eccaf9e0391b`) — child of wrapper
- `parent_project_id`: null → `6aba81214dd5495fb5b08cd2f` (Social Content Trial wrapper)
- `notes`: → "Batch 2 of 30-day trial. Currently concepting; estimated 5-6 pieces from the 19 remaining (after Batch 1 = 6 Hugh Content pieces). Subject to client scoping."

**Note on `contractStart` / `contractEnd`:** not setting on Social Content Trial yet — wrapper guard still pins start/end to the project row's current values (both null), which keeps recompute from clobbering them. If we want the wrapper to display a SOW window, set contractStart/contractEnd as a follow-up batch once the formal $30K SOW is signed.

**Task: Concept Writeups** (`21d089ecb4e747ffb66040cee`)
- `resources`: `"Sami, Lane"` → `"CM: Sami, CD: Lane"`
- `status`: null → `scheduled`

### Soundly (slug `soundly`, client_id `c68d8a44464245dd9c3075f26`)

**Pipeline item: AARP Member Login + Landing Page** (`e9350d02f1e94905b7f6b0e07`)
- `status`: `at-risk` → `signed`
- `waiting_on`: `"Soundly to sign"` → `null`
- `notes`: "Not starting until signed. Launch 7/15. HIGH PRIORITY." → "SOW signed and kicked off; Project in-production. Launch target 7/15."

**Task: Payment Gateway Page — In Dev** ~~(4/23 weekOf, status null)~~ **DROPPED 2026-04-28** — prod check confirmed Task is already at status=in-progress (someone flipped it, possibly Jill); also weekOf in prod is 2026-04-20 not 4/23 as plan assumed. No-op write; removed from batch entirely.

### Bonterra (slug `bonterra`, client_id `11fb1b5f90014a5dac1030d37`)

**Task: Impact Report — Internal Review** (`5a9e9cfcaa4f40eaaed24de2b`)
- `status`: null → `completed`
- `notes`: "Walk team through Dev build; flag issues to fix before 4/28 handoff" → "Held 4/23. Bonterra delivered additional changes 4/27 morning; rolled into Dev IR Revisions. Final Review with Bonterra Wed 4/29."

**Task: Impact Report — Dev Handoff** → renamed to **Impact Report — Dev IR Revisions** (`0dc160b4b7e7484dada9e8ded`)
- `category`: `deadline` → `delivery` *(added 2026-04-28 — required FIRST. While `category="deadline"`, any `date` change reverse-cascades to `projects.dueDate` via operations-writes-week.ts:446. Flipping category to delivery before changing date prevents the cascade. Drafter MUST sequence category before date.)*
- `title`: "Impact Report — Dev Handoff" → "Impact Report — Dev IR Revisions"
- `date`: 2026-04-28 → 2026-04-23
- `startDate`: 2026-04-28 → 2026-04-23
- `endDate`: null → 2026-04-29
- `weekOf`: 2026-04-27 → 2026-04-20
- `dayOfWeek`: tuesday → thursday
- `status`: null → `in-progress`
- `notes`: "Next Step: Impact Report K/O to Dev (Risk: Hard client deadline. Client was 3 weeks late on content)" → "Lane + Leslie addressing changes from Internal Review (4/23) + Bonterra's additional 4/27 morning changes. Wraps Wed 4/29 for Final Review."

**Task: Impact Report — Go Live** (`ffe37e79a6014b1cb1171a595`)
- `status`: null → `scheduled`
- `notes`: "Next Step: Launch Impact Report (Risk: tight given compressed timeline)" → "Bonterra-side WordPress launch by 5/11; potential push to 5/13 per Jill 2026-04-27."

## Pre-checks

1. All target row IDs exist at expected coords (per per-row optimistic concurrency).
2. Capture each row's `updated_at` at pre-check; helpers handle this internally for fuzzy lookups (no raw UPDATEs in this batch — see "No raw UPDATE" note below).
3. AG1: confirm Social Content Trial Project still exists at expected ID (parent target) AND `engagementType` is currently null (idempotency for engagementType change — added 2026-04-28).
4. AG1: confirm AG1 PRO Content Project's `parent_project_id` is currently null.
5. Bonterra: confirm Dev Handoff is at expected pre-state: `category=deadline`, `title="Impact Report — Dev Handoff"`, `weekOf=2026-04-27`, `date=2026-04-28`, `startDate=2026-04-28`, `endDate=null`, `dayOfWeek=tuesday`, `status=null`.
6. Soundly: confirm pipeline_item is still at-risk, Project AARP still in-production.
7. Soundly: confirm Payment Gateway Task exists at expected weekOf+title+projectId, status=null.

**No raw UPDATE in this batch:** all field changes route through `updateProjectField`, `updateWeekItemField`, and `updatePipelineItem` — none of the affected fields are recompute-derived columns like `endDate` was for LPPC. So no per-row `updated_at` capture is needed for raw-UPDATE optimistic concurrency.

## Helpers used

- `updateProjectField` for parent_project_id, engagementType, notes (all in PROJECT_FIELDS whitelist)
- `updateWeekItemField` for status, title, date, startDate, endDate, weekOf, dayOfWeek, notes, resources, category (per WEEK_ITEM_FIELDS whitelist) — null current values flip cleanly to non-null new values via this helper (verified against LPPC Phase 3 pattern)
- `updatePipelineItem` for pipeline status + waitingOn + notes
- `setBatchId(BATCH_ID)` wrap, runner auto-derives same value from filename

## Multi-field ordering — Bonterra Dev Handoff (added 2026-04-28)

Dev Handoff (`0dc160b4b7e7484dada9e8ded`) gets 9 sequential field updates: category, title, date, startDate, endDate, weekOf, dayOfWeek, status, notes. `updateWeekItemField` looks up the row by `(weekOf, title)` (operations-writes-week.ts:350 → `resolveWeekItemOrFail`). Both `weekOf` and `title` are changing, so the lookup key drifts mid-sequence.

**Required order** (drafter must enforce):

1. `category` — `deadline` → `delivery` (so date change in step 3 doesn't reverse-cascade)
2. `title` — "Impact Report — Dev Handoff" → "Impact Report — Dev IR Revisions" (lookup still uses old weekOf)
3. `date` — 2026-04-28 → 2026-04-23
4. `startDate` — 2026-04-28 → 2026-04-23
5. `endDate` — null → 2026-04-29
6. `dayOfWeek` — tuesday → thursday
7. `weekOf` — 2026-04-27 → 2026-04-20 (lookup-key change; track running weekOf for subsequent calls)
8. `status` — null → `in-progress`
9. `notes` — refresh

**Implementation pattern** (mirror LPPC triplet lines 429-461 but track BOTH `currentTitle` and `currentWeekOf`): after each field write where the field is `title` or `weekOf`, update the running tracker before the next call.

`endDate` is in WEEK_ITEM_FIELDS (operations-utils.ts:361) — no raw UPDATE needed. The null → 4/29 write goes through `updateWeekItemField` cleanly.

## REVERT path

- Distinct `UPDATED_BY = REVERT batch_id` to avoid idempotency-key collisions per `feedback_revert_idempotency_poisoning.md`
- All status flips revert to null via `updateWeekItemField` (operations-writes-week.ts:363 only validates non-null newValue for status; null pass-through writes cleanly + creates audit row)
- Notes revert to captured pre-state values from pre-apply snapshot
- AG1 PRO Content `parent_project_id` reverts to null (via `updateProjectField` — empty-string clears per PR #88 convention)
- AG1 Social Content Trial `engagementType` reverts to null (drafter: confirm `updateProjectField` accepts null/empty for engagementType; if not, use raw UPDATE + manual audit)
- Bonterra Dev Handoff renamed back from "Dev IR Revisions" + range collapsed: title, date, startDate=4/28, endDate=null, weekOf=4/27, dayOfWeek=tuesday, status=null, notes=original, **category back to `deadline`**
  - REVERT order (mirror of APPLY but reversed): notes → status → weekOf (track lookup-key drift) → dayOfWeek → endDate → startDate → date → title → category. Category last on REVERT so the reverse cascade from date-restore (4/23 → 4/28) fires while still in `delivery` mode, then category flips back to `deadline` (no further cascade since date is already settled).
- Soundly pipeline_item status reverts to at-risk + waitingOn restored to "Soundly to sign" + notes restored
- Soundly Payment Gateway status reverts to null via `updateWeekItemField`

## Decision logs

| Decision | Source | Captured 2026-04-27 |
|---|---|---|
| AG1 PRO Content nests under Social Content Trial | Operator confirmed | "AG1 PRO Content is another batch of content that falls under the 30 day trial" |
| AG1 PRO scope: ~5-6 pieces of 19 remaining (not all 19) | Operator correction | "I am not saying AG1 Pro will be 19 content pieces, we are concepting right now... My guess would be 5-6 potentially." |
| Bonterra Dev Handoff → Dev IR Revisions 4/23-4/29 in-progress | Operator | "I think this should be Dev IR Revisions, running from 4/23 - 4/29." |
| Bonterra Internal Review → completed | Jill via Slack | "yes. they had a couple other changes this morning that she is working on so we'll review with bonterra on wed." |
| Bonterra Go Live possible push 5/13 | Jill via Slack | "they may have pushed their launch until 5/13, but after we hand off on Thursday- we should be done." |
| Soundly pipeline_item flip-to-signed | Operator + Jill via Slack notes 2026-04-27 | "we've told AI several times that Pipeline item ... has already been signed and is also currently being worked on" |
| Soundly Payment Gateway Task in-progress (assumption) | Inferred from Project status; **mark for op review** | Not directly confirmed by Jill — flagging as assumption |

## Open question (pre-DRY_RUN)

- Soundly Payment Gateway Task status flip is an *assumption* (Project is in-production through May, so Task is likely in-progress). If you want certainty, ping Jill before APPLY. Recco: proceed with assumption + flag for monitoring.
