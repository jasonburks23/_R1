# Other Accounts — Remaining Updates from Data Integrity Doc — 2026-04-27

**Status:** Plan FINAL — operator-locked scope 2026-04-28 morning. All 5 open Qs resolved. Triplet drafting next.

## FINAL SCOPE (operator-locked 2026-04-28)

**IN SCOPE:**

| Item | Operation | Audit rows |
|---|---|---|
| Dave Asprey: Disconnect Sheet (4/29) | `updateWeekItemField` status null → in-progress | 1 |
| Dave Asprey: Final Post (4/30) | `updateWeekItemField` status null → in-progress | 1 |
| Dave Asprey: Drive Folder Handoff (4/30) | `createWeekItem` (doesn't exist in prod) — status scheduled, owner Allison, weekOf 4/27, date 4/30, dayOfWeek thursday | 1 |
| Wilsonart Chester Videos | `updateProjectField` (or `update_project_status`) status in-production → completed | 1 |
| EDF TBD project | `updateProjectField` status not-started → on-hold + notes refresh | 2 |
| TAP client | `updateClientField` contractValue null → "$120,000" (operator is the source — wrote SOW) | 1 |
| ABM RFP Response: Shortlist Notification (4/22) | `createWeekItem` status completed, weekOf 4/20, date 4/22, dayOfWeek tuesday, owner Jill, resources HDL, notes "Shortlist notification received per Kathy 2026-04-27" | 1 |
| ABM RFP Response: Presentation (5/8 3pm EST) | `createWeekItem` status scheduled, weekOf 5/4, date 5/8, dayOfWeek thursday, owner Jill, resources HDL, notes "Presentation 3pm EST per Kathy 2026-04-27" | 1 |
| team_members: Ronan Lane | DELETE row (currently isActive=0 with stale accountsLed) — drafter calls raw drizzle DELETE + manual audit insert | 1 |

**Total estimate: ~10 audit rows.**

**DROPPED from scope (operator 2026-04-28):**
- Hopdoddy (entire — date push, resources fix, $14.8K incremental — all skipped)
- LPPC holdovers (Website Blog Posts, MyLPPC Training Video, Mailchimp Invites — already in coherent state, no writes needed)
- AG1 Social Content Trial Batch 1 Files Due Task (doesn't exist in prod; if Allison/Jill want it tracked, they'll Slackbot it)
- Paige (not in team_members table — never existed as row; no-op)
- Jill `accountsLed` add lppc (operator declined; Kathy stays on lppc as the only lead)

**Schema notes for drafter:**
- Dave Asprey "Final Post" actual prod title is "Retainer Close — Final Post" — use that for lookup
- Dave Asprey "Disconnect" actual prod title is "Disconnect Google Sheet from ManyChat" — use that for lookup
- ABM RFP Response project currently has 0 weekItems — both ABM Tasks are creates, no update path
- TAP `contractValue` format must match other clients: `"$NN,NNN"` with quotes and comma (e.g., "$93,000", "$120,000")
- Ronan Lane delete: drafter checks `update_team_member` MCP / helper for delete support; if absent, raw drizzle DELETE on team_members + manual audit via `insertAuditRecord` mirroring LPPC raw-UPDATE pattern

---

(Pre-2026-04-28 plan content preserved below for context — superseded by FINAL SCOPE above)

## Original status note

Three fresh-eyes corrections applied 2026-04-28: Hopdoddy startDate, Paige field name, ABM create-vs-update fork.

**Source doc:** Google Doc `1QyslZZPagrq81a-v6Xmz5oj1fgsLhfl9CG89CMYb_ms` ("Data Integrity — Other Account Questions") with cross-account answers from Kathy, Jill, Jason, Allison.

**Cross-refs:**
- Original multi-wave plan: `docs/tmp/data-integrity-audit/multi-wave-plan-2026-04-27.md` (umbrella; this doc carves out the "rest" of it)
- LPPC Phase 3 plan (separate batch): `lppc-phase3-plan-2026-04-27.md`
- AG1+Soundly+Bonterra plan (separate batch): `ag1-soundly-bonterra-plan-2026-04-27.md`
- HDL planning: closed; triplet not yet drafted (separate batch)

## What's covered here

Everything from the Data Integrity doc that's *not* in LPPC Phase 3, AG1+Soundly+Bonterra cleanup, or the HDL ad-hoc batch.

| Client | Scope | Risk | Operator gate |
|---|---|---|---|
| Hopdoddy | Brand Refresh Website Launch date slip + status flip; possible $14.8K incremental scope | Low-Medium | Open Q on incremental: pipeline item / contract bump / note? |
| Dave Asprey | Wind Down Tasks (Disconnect Google Sheet 4/29, Final Post 4/30) status flip; Content Drive Folder + Calendar Handoff (4/30) | Low | None — clean answers from doc |
| Wilsonart | Chester Videos in-production → completed | Low | None — operator: "Done" |
| EDF | TBD project not-started → on-hold | Low | None — Kathy: "should go on-hold until we hear back from client" |
| LPPC | 3 holdover Projects → cancel (Website Blog Posts, MyLPPC Training Video, Mailchimp Invites) | Medium | Open Q: cancel vs on-hold vs delete? Recommend cancel |
| TAP | contract_value bump to $120K | Low | Confirm from operator (was on multi-wave plan with no source citation) |
| ABM | RFP Response: Shortlist Notification 4/22 → completed; Presentation 5/8 3pm EST → scheduled | Low | None — Kathy confirmed received 4/22, presentation 5/8 |
| AG1 | Social Content Trial: Batch 1 Files Due (4/27) → in-progress | Low | None — Jill: Batch 1 final tweaks |
| Bonterra | Pipeline_item flip (already covered in AG1+Soundly+Bonterra batch — *delete from this list*) | — | — |
| Soundly | AARP pipeline_item (already covered in AG1+Soundly+Bonterra batch — *delete from this list*) | — | — |
| Team | Paige inactive | Low | Open Q: full inactive vs Bonterra-only roll-off? |

## Per-client write spec (to validate before drafting)

### Hopdoddy

**Project: Brand Refresh Website Launch**
- Existing Task "Launch" with weekOf=2026-04-27 → push to 2026-05-18 or 5/19 per Jill (operator: pick exact date)
- Status null → scheduled
- **`date` AND `startDate`** both updated to chosen date — `endDate` only if range, otherwise leave null *(added 2026-04-28: same recompute time-bomb pattern as LPPC — date alone leaves startDate stale, recompute reverts Project endDate on next child write. Drafter: include `startDate` in field changes.)*
- `weekOf`: 2026-04-27 → Monday of chosen week (5/18 → weekOf=2026-05-18; 5/19 → weekOf=2026-05-18)
- Notes: "Launch pushed to 5/18-19 per Jill 2026-04-27"

**Open Q:** $14.8K incremental work — pipeline item / contract bump / note?
- Recco: pipeline item (preserves history, signals new revenue)
- Operator answer pending

### Dave Asprey

**Project: Social Retainer — Wind Down**
- Task: Disconnect Google Sheet from ManyChat (4/27) → status null → in-progress (Allison handles 4/29)
- Task: Final Post (4/30) → status null → in-progress
- Task: Content Drive Folder + Calendar Handoff (4/30) → status null → scheduled

### Wilsonart

**Project: Chester Videos**
- status in-production → completed (operator: "Done — Call it finished")

### EDF

**Project: TBD — Work may pick up w/o 4/13**
- status not-started → on-hold
- Notes: "Hold until client comes back" per Kathy 2026-04-27

### LPPC holdovers (3 Projects)

All neither Kathy nor Jill recognize; Jill: "holdover from prior retainer."

- Website Blog Posts: status on-hold → canceled
- MyLPPC Training Video: status on-hold → canceled
- Mailchimp Invites (Spring + Fall): status on-hold → canceled

**Operator gate:** confirm cancel (recommended) vs on-hold (more conservative) vs delete (loses history; cascades to child Tasks).

### TAP

**Client contract_value:** → $120K
- Operator note in multi-wave plan flagged this; confirm source before writing

### ABM

**Project: RFP Response**
- Task: Shortlist Notification Received (4/22 weekOf) → status null → completed (Kathy: notice received 4/22)
- Task: Presentation 5/8 3pm EST — **runtime fork** (added 2026-04-28):
  - Pre-check: query weekItems where projectId=RFP Response, weekOf=2026-05-04, title fuzzy-matches "Presentation"
  - **If exists**: status null → scheduled; date 2026-05-08; verify resources/owner; notes refresh "Presentation 3pm EST per Kathy 2026-04-27"
  - **If not exists**: `createWeekItem` with title="Presentation", date=2026-05-08, weekOf=2026-05-04, dayOfWeek=thursday, status=scheduled, owner=Kathy (or whoever leads ABM RFPs), notes="Presentation 3pm EST per Kathy 2026-04-27"
  - Drafter: branch the helper call based on the pre-check result; surface in plan log which path fired

### AG1 Social Content Trial

**Project: Social Content Trial** (NOT AG1 PRO Content — that's in the bundle)
- Task: Batch 1 — Files Due (weekOf 4/27) → status null → in-progress (Jill: Batch 1 final tweaks)
- Task: Batch 2 Concept Write-ups Due — already created today by Allison as "Concept Writeups" under AG1 PRO Content; covered by bundle. No-op here.

### Team Member: Paige

- Drizzle camelCase column name is `isActive` (sqlite snake_case `is_active`). Drafter: use `isActive` in the helper / drizzle update call.
- Possibly: `team_members.isActive = false` (full inactive) — Kathy: "no longer on the team"
- Or: remove "bonterra" from her `accountsLed` JSON array (rolled off Bonterra only)
- Operator gate: full inactive (recommended) vs partial roll-off
- Drafter: confirm whether a `updateTeamMember` helper exists in `src/lib/runway/operations*`. If yes, use it (creates audit row). If not, raw drizzle UPDATE on team_members + manual audit insert via `insertAuditRecord` (mirroring the LPPC raw-UPDATE pattern).

## Audit-row estimate: ~17-20 rows (revised 2026-04-28)

| Client | Field changes | Audit rows |
|---|---|---|
| Hopdoddy | status, date, **startDate**, weekOf, notes (all on Launch task) | 5 |
| Dave Asprey | 3 status flips (Disconnect Sheet, Final Post, Drive Folder Handoff) | 3 |
| Wilsonart | 1 status flip (Chester Videos) | 1 |
| EDF | status flip + notes refresh on TBD Project | 2 |
| LPPC holdovers | 3 status flips (3 Projects) | 3 |
| TAP | 1 client.contractValue field | 1 |
| ABM | Shortlist Notification status flip; Presentation row (1 audit if updating, ~1 if creating) | 2 |
| AG1 | 1 status flip (Batch 1 Files Due) | 1 |
| Paige | 1 team_member field (isActive or accountsLed JSON) | 1 |

**Total: ~19 audit rows** (assuming ABM Presentation is single-row create).

## Open operator decisions

1. **LPPC holdovers**: cancel / on-hold / delete?
2. **Hopdoddy $14.8K incremental**: pipeline item / contract bump / note?
3. **TAP $120K bump**: confirm source (was in multi-wave plan but unsourced)
4. **Paige scope**: full inactive vs Bonterra-only roll-off?
5. **ABM Presentation 5/8**: does this Task exist or need creating?

## Recommended sequencing

1. LPPC Phase 3 first (drafted, awaiting DRY_RUN)
2. AG1+Soundly+Bonterra second (drafted, awaiting DRY_RUN)
3. HDL ad-hoc third (planning closed, drafting next session)
4. **THIS BATCH fourth** — only after operator answers the 5 open questions above

## Pre-draft checklist (when ready)

- [ ] Re-pull all referenced clients fresh from prod (drift since 2026-04-27)
- [ ] Resolve all 5 open Qs above
- [ ] Validate Task IDs by client (id-prefix lookup pattern)
- [ ] Decide whether to bundle as one batch or split by risk class (lifecycle changes vs status flips vs new rows)
- [ ] (Added 2026-04-28) For any task where `date` is being shifted, also include `startDate` (and `endDate` for ranges) in the field changes — same time-bomb fix as LPPC Phase 3
- [ ] (Added 2026-04-28) Confirm `updateTeamMember` helper presence; if absent, use raw drizzle UPDATE + manual audit for Paige's isActive/accountsLed
