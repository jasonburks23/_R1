# Convergix — hot sheet vs prod reconciliation

Hot sheet source: https://docs.google.com/spreadsheets/d/13TMzEdhG0xqqA4kxFQb7_tMMPV1CqbPdun4TTtak5bQ/edit?gid=766543072#gid=766543072
Read on 2026-04-22.

Contract window: Convergix retainer Feb 1 – Jul 31, 2026.

## Active/in-flight reconciliation

| Hot sheet L1 | Prod L1 | Prod status | Prod computed end | Hot sheet milestone | Delta | Decision |
|---|---|---|---|---|---|---|
| Rockwell PartnerNetwork Award Article | Rockwell PartnerNetwork Article | in-production (stale=4) | 2026-04-23 | Social 4/23, article live | ✓ | keep |
| Texas Instruments Article | Texas Instruments Article | in-production (stale=4) | 2026-04-23 | Social 4/24, site W/O 4/20 | ✓ close | keep |
| Events Page Updates (tradeshow pages) | Events Page Updates (5 tradeshows) | in-production | 2026-05-06 | Website update W/O 4/20–4/27 | ✓ | keep |
| [booth work inside Events Page on hot sheet] | AUTOMATE 2026 Booth Design | in-production | 2026-06-22 | Booth layout 4/24, show June 22–25 | **structural split** | **Q1 for Kathy** |
| Certifications | Certifications Page | awaiting-client | 2026-04-23 | TBD, waiting on Daniel | status close ("awaiting-client" vs "Pending Kickoff" — equivalent) | keep, but 4/23 end date likely wrong |
| Fanuc Award Article/Post | Fanuc Award Article + LI Post | not-started | 2026-04-30 | Award 4/28 | tight | **Q7 for Kathy — start pre-write this week?** |
| Social Content Creation | Social Content (12 posts/mo) | in-production | 2026-04-27 | Rolling monthly | end-date too near? | likely roll forward monthly |
| Industry Vertical Campaigns | Industry Vertical Campaigns | in-production | **2026-07-31** | R1 feedback 4/23 | **end pulled by "Retainer Period Close" L2** | **Q5 for Kathy — real wrap date?** Consider removing close-L2 once wrapper lands |
| Rockwell Automation Co-Marketing | Rockwell Automation Co-Marketing Efforts | awaiting-client | 2026-04-23..04-23 | TBD | **single-day range isn't real** | **Q6 for Kathy — any timing yet?** |
| Big Win Template (PPT, internal) | Big Win Template (1 L1, 2 L2s) | in-production | 2026-04-23 | 4/22 EOD + 4/23 | ✓ consolidation | keep, but confirm Q3 |
| Corporate Overview Brochure | merged into Corporate Collateral Updates | in-production | 2026-06-30 | TBD | ✓ consolidation | confirm Q2 |
| Corporate PPT | merged into Corporate Collateral Updates | — | — | TBD | ✓ | confirm Q2 |
| New Capacity | New Capacity (PPT, brochure, one-pager) | awaiting-client | 2026-04-30 | JJ feedback 4/24 | ✓ close | keep |
| Brand Guide | Brand Guide v2 (secondary palette) | in-production | **2026-04-30** | **4/23 final files** | **prod 7 days late** | **Q4 for Kathy — 4/23 or 4/30?** |
| Tertiary Pages (Completed per hot sheet) | — | — | — | launched W/O 3/9 | **missing from prod** | ignore (historical) or add as completed stub |
| Automotive Site Update (TBD) | — | — | — | tiny copy fix | **missing from prod** | add only if Kathy confirms it's active |

## Completed items — prod ✓ matches hot sheet
Life Sciences Brochure, Social Media Templates, Organic Social Playbook — all `completed` in both sources.

## Historical completions in hot sheet NOT in prod (OK to leave out)
Corporate Presentation, Sales Proposal Template, Website Updates (stats), CDS Collateral, Careers Page, Social Links Footer, PPT Template, Biz Cards, Square Flyer MOO.

## Wrapper migration plan (once Q&A done)

1. Insert wrapper L1: `name="Convergix Retainer"`, `engagement_type='retainer'`, `contract_start='2026-02-01'`, `contract_end='2026-07-31'`, `client_id=<convergix.id>`, `status='in-production'`, `category='active'`. No L2s, no start/end (will compute from children).
2. Set `parent_project_id` on the 15 active Convergix L1s (everything except the 3 completed ones — Life Sciences Brochure, Social Media Templates, Organic Social Playbook — unless operator wants them nested too for historical completeness).
3. Verify on the board: By Account view nests them, This Week view **hides the wrapper** (requires CC #1 filter).
4. Revert path if anything looks off: null out `parent_project_id` on the 15 rows + delete wrapper.

Batch hygiene for the write:
- Use `setBatchMode()` with batch_id like `convergix-wrapper-2026-MM-DD`.
- `updated_by` unique to this batch.
- DRY_RUN script first that prints the writes it would make, then a guarded APPLY.
- Single commit-less session — treat as data-only, no git action.

## Open structural questions to resolve before wrapper write
(See `pending-decisions.md` for Kathy's exact question list.)
