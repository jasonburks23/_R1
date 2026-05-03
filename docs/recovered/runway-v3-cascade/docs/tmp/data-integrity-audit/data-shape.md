# Prod data shape

Source DB: `libsql://runway-jasonburks.aws-us-east-1.turso.io`

**Baseline captured:** 2026-04-22 13:31 UTC
**Last refresh:** 2026-04-22 ~22:45 UTC (post-Convergix-cleanup-apply)

**Prod is actively changing while we work.** Re-pull with `pnpm runway:pull` before acting on any number here.

## Row counts (current, post-Convergix-cleanup)
| Table | Rows | Change since baseline |
|-------|------|---|
| clients | 13 | — |
| projects | **49** | **+4** (Convergix monthly Social Content split: +3 May/June/July; Industry Vertical split: +1 Industrial/Battery Assembly) |
| week_items | **74** | **+2 net** (−1 Kathy 9:01 delete, +5 creates from Convergix cleanup, −2 deletes from Convergix cleanup) |
| pipeline_items | 7 | — |
| updates (audit) | **~758** | **+101** (Convergix Kathy-cleanup 92 + followup 9) + existing Kathy 9:01 batch 6 |
| team_members | 11 | — |
| view_preferences | 1 | — |

**Convergix-specific counts post-cleanup:**
- Projects: 16 → **20** (4 new: Social Content May/June/July, Industrial/Battery Assembly Campaign)
- Week_items: 30 → **33** (5 creates + 2 deletes)
- NULL-status L2s: 7 → **0** (all resolved per-row)

## Clients (13)
`abm, ag1, beyond-petro, bonterra, convergix, dave-asprey, edf, hdl, hopdoddy, lppc, soundly, tap, wilsonart`

Contract status: 9 signed, 3 unsigned (abm, ag1, edf), 1 expired (hdl).

## Projects by engagement_type
- `retainer`: **18** (all Convergix × 15 + dave-asprey × 1 + hopdoddy × 1 + 1 other)
- `project`: 14 (LPPC × 5 + Soundly × 3 + HDL × 1 + Hopdoddy Brand Refresh × 1 + Bonterra × 1 + TAP × 1 + completed Convergix × 2 + others)
- `NULL`: 13 (Beyond Petrochemicals × 9, plus ABM, AG1, EDF, Wilsonart singletons)

**Correction 2026-04-22 post-Phase-3-audit:** earlier baseline said BP had 10 L1s; actual prod count is 9. Updated above.

## Projects by status
in-production: 27 | awaiting-client: 4 | not-started: 6 | on-hold: 3 | completed: 5

## Projects by category
active: 30 | awaiting-client: 6 | on-hold: 4 | completed: 5

## Date-field presence (projects, n/45)
- `start_date`: 25
- `end_date`: 25
- `contract_start`: 18 (all 18 retainers ✓)
- `contract_end`: 18 (all 18 retainers ✓)
- `due_date`: 0 (legacy column, empty)

## Wrapper state
**parent_project_id: 0 rows set.** Column exists; feature is code-complete; no data uses it yet.

## Week items (72)
Status: completed 3 / in-progress 13 / blocked 32 / **NULL 24** / scheduled 0
(Deltas from Kathy 9:01: April Social — Week of 4/20 Posts flipped in-progress → completed; Partner-of-Year swap deleted while blocked; Rockwell Partner Award — Image Swap notes clarified; Big Win Template PPT still NULL status.)
Category: kickoff 30 / delivery 17 / deadline 9 / approval 8 / launch 6 / review 3

**Every integrity check passes except NULL status:**
- 0 rows with missing start_date
- 0 rows with missing/bad project_id
- 0 rows with bad client_id
- 0 malformed `blocked_by` JSON or unknown id refs
- 0 orphaned parent_project_id refs

## NULL week_item.status distribution by client
LPPC 10, Convergix 7, Bonterra 3, Dave Asprey 2, Soundly 1, Hopdoddy 1.
These are all pre-backfill legacy rows. The migration `scripts/runway-migrations/2026-04-21-backfill-scheduled-status.ts` exists but has NOT been run against prod.

## Retainers (18) — all have contract_start + contract_end populated
### Convergix (15)
Contract window: 2026-02-01..2026-07-31 shared across all 15 L1s.

| L1 | status | computed start..end | kids | L2s |
|---|---|---|---|---|
| AUTOMATE 2026 Booth Design | in-production | 2026-04-22..2026-06-22 | 0 | 1 |
| Big Win Template | in-production | 2026-04-22..2026-04-23 | 0 | 2 |
| Brand Guide v2 | in-production | 2026-04-30..2026-04-30 | 0 | 1 |
| Certifications Page | awaiting-client | 2026-04-23..2026-04-23 | 0 | 1 |
| Corporate Collateral Updates | in-production | 2026-04-30..2026-06-30 | 0 | 3 |
| Events Page Updates (5 tradeshows) | in-production | 2026-04-23..2026-05-06 | 0 | 2 |
| Fanuc Award Article + LI Post | not-started | 2026-04-23..2026-04-30 | 0 | 2 |
| Industry Vertical Campaigns | in-production | 2026-04-23..**2026-07-31** ← pulled by "Retainer Period Close" L2 | 0 | 7 |
| Life Sciences Brochure | completed | null..null | 0 | 0 |
| New Capacity (PPT, brochure, one-pager) | awaiting-client | 2026-04-23..2026-04-30 | 0 | 3 |
| Organic Social Playbook | completed | null..null | 0 | 0 |
| Rockwell Auto Co-Marketing Efforts | awaiting-client | 2026-04-23..2026-04-23 | 0 | 1 |
| Rockwell PartnerNetwork Article | in-production | 2026-04-23..2026-04-23 (stale=4) | 0 | 3 |
| Social Content (12 posts/mo) | in-production | 2026-04-23..2026-04-27 | 0 | 2 |
| Social Media Templates | completed | null..null | 0 | 0 |
| Texas Instruments Article | in-production | 2026-04-23..2026-04-23 (stale=4) | 0 | 3 |

### Other retainers
- Dave Asprey: **Social Retainer — Wind Down** (contract 2025-11-14..2026-04-30) — retainer wrap in ~8 days.
- Hopdoddy: **Digital Retainer (195 hrs)** (contract 2026-01-01..2026-12-31) — no L2s, no computed dates, no children. Already wrapper-shaped but not used as one.

## Projects missing start/end (19 projects)
- 9 Beyond Petro L1s (all NULL engagement_type)
- 4 Convergix completed historical (Life Sciences Brochure, Organic Social Playbook, Social Media Templates, + Hopdoddy Digital Retainer which is active)
- 3 LPPC (2 completed + Mailchimp Invites on-hold)
- ABM RFP, AG1 trial, EDF TBD, Wilsonart Chester Videos (all NULL engagement_type, pre-v4)

## Audit log (updates table) — recent batches
Format: `batch_id — n rows — last-write time`

| Batch | Rows | Last write |
|---|---|---|
| timestamp-correction-2026-04-22 | (in-place correction of 38 rows, no new audit rows) | 2026-04-22 ~23:45 UTC |
| convergix-kathy-cleanup-followup-2026-04-22 | 9 | 2026-04-22 ~22:50 UTC |
| convergix-kathy-cleanup-2026-04-22 | 92 | 2026-04-22 ~22:40 UTC |
| hotsheet-cleanup-2026-04-22 | 34 | 2026-04-22 02:05 (post-correction) |
| target-to-notes-raw-2026-04-21 | 4 | 2026-04-21 22:58 (post-correction) |
| retainer-v4-cleanup-2026-04-21-retry | 92 | 2026-04-21 22:31 |
| retainer-v4-cleanup-2026-04-21-revert | 40 | 2026-04-21 21:20 |
| retainer-v4-cleanup-2026-04-21 | 38 | 2026-04-21 20:57 |
| hdl-v4-realign-2026-04-21 | 6 | 2026-04-20 23:55 |
| tap-v4-realign-2026-04-21 | 13 | 2026-04-20 23:54 |
| lppc-v4-realign-2026-04-21 | 9 | 2026-04-20 23:54 |
| soundly-v4-realign-2026-04-21 | 8 | 2026-04-20 23:41 |
| convergix-v4-realign-2026-04-21 | 30 | 2026-04-20 23:38 |
| bonterra-v4-touchup-2026-04-21 | 4 | 2026-04-20 23:34 |

Timestamp bug resolved 2026-04-22 under `timestamp-correction-2026-04-22` (see `known-issues.md` #5).
