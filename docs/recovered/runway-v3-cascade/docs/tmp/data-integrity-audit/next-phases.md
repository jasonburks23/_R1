# Next phases — post-Convergix work

**Written by pre-compaction me for post-compaction me.** Read this after `README.md` and the baseline files.

## Phase 1 — Finish Convergix (DONE 2026-04-22)

Status: **APPLIED.** Q1-Q5 drafted, Kathy replied, data-write batch applied + followup correction applied. See `convergix-batch-plan.md`, `convergix-batch.ts`, `convergix-followup.ts`, `convergix-post-verify-v2.txt`.

**What landed (highlights):**
- Social Content split from 1 rolling L1 to 4 monthly L1s: April (renamed), May, June, July.
- Industry Vertical Campaigns split: existing renamed to `CDS Vertical Campaign` (wraps 5/14); new `Industrial/Battery Assembly Campaign` created (6/1 → 7/31, scoping gated on Jamie Nelson Connect).
- Brand Guide v2 renamed (secondary palette dropped; final files 4/23).
- 7 NULL-status L2s resolved per-row (2 in-progress flips, 2 scheduled flips, 1 blocked flip, 2 deletes).
- All L1 `endDate` corrections driven by L2 changes + `recomputeProjectDatesWith` (never direct-written).
- New Tasks: Events Page Staging (4/30), New Capacity PPT Complete (5/4-5/8), Rockwell Nicole Team Conversation (4/28-4/29), CDS Case Study (2 pages), Assembly Campaign Completion Target (7/31 anchor), May Content Calendar draft moved from April L1 to new May L1.
- Retainer renewal Task (Kathy Q5b "last week of May conversation with Daniel"): DEFERRED to wrapper migration per operator decision. Add it when creating the Convergix Retainer wrapper post-CC #1.

Remaining Convergix Projects not yet covered by a question:
- Rockwell PartnerNetwork Article — partially touched by Kathy 15:01 UTC (consolidated image-swap duplicate); Daniel is still a blocker on social post approval.
- Texas Instruments Article — Daniel pending confirm on social repost.
- Rockwell Automation Co-Marketing Efforts — Daniel pending scope clarity. The hot-sheet scope is complex (case study, OEM social page, Automation Fair Nov, portal updates). Will need a dedicated question.
- Social Content (12 posts/mo) — recurring monthly cadence. Needs modeling conversation with Kathy about how this should be tracked through the retainer window.
- Brand Guide v2 — simple date question (hot sheet 4/23 vs prod 4/30).
- Industry Vertical Campaigns — CDS campaign real wrap date + Industrial/Battery Assembly start. The "Retainer Period Close" task artificially extends end_date to 7/31 — needs to go or get justified.
- AUTOMATE 2026 Booth Design — mostly handled by Q1 follow-ups but may need scope questions about panel production / print.
- New Capacity (PPT, brochure, one-pager) — JJ feedback 4/24 gates next phase.
- Certifications Page — covered by Q2 cluster.
- Fanuc Award Article — covered by Q2 cluster.
- Corporate Collateral Updates — covered by Q2 cluster.
- Big Win Template — Kathy just updated notes ("going to client today 4/22") and task status is still NULL. Likely just needs task status flip.

Once Kathy replies, two output paths:
1. **Non-destructive data fixes** (end dates, NULL→scheduled status flips, note cleanup): operator does with explicit approvals.
2. **Structural changes** (splits/merges of Projects, new Tasks for future shows): operator + me design write scripts together.

## Phase 2 — Convergix retainer wrapper migration

Preconditions:
- Phase 1 complete (Convergix data matches Kathy's mental model).
- CC #1 (flags-consolidation) merged and deployed — to avoid the wrapper appearing as a ghost on the This Week view.

Work: insert a "Convergix Retainer" wrapper Project + set `parent_project_id` on the 15 active Convergix L1s. See `convergix-reconciliation.md` for the plan. Operator has given explicit permission in advance for this write.

## Phase 3 — Audit the other 12 accounts

**Operator ask:** after Convergix is clean, audit the other accounts and produce **one combined question doc for Kathy and team** covering all remaining data integrity questions. One doc, not thirteen. Post-compaction me probably drafts this.

Accounts to audit (in likely priority order by activity level):
1. **LPPC** — website revamp is Kathy-owned, busy. 10 NULL-status Tasks. Multiple in-flight deliverables. Kathy just made LPPC updates 2026-04-21 14:04 UTC (see audit log).
2. **Bonterra** — Impact Report active (Jill-owned). 3 NULL-status Tasks. Has unsigned SOW risk.
3. **Beyond Petrochemicals** — 10 projects, **all with NULL engagement_type**. They're on an MSA. Needs contract metadata pass (engagement_type, contract dates). Owner pattern different: Kathy Horn + Jill Runyon + Jason Burks.
4. **Soundly** — 3 projects (iFrame, Payment Gateway, AARP). Jill-owned. 1 NULL-status Task.
5. **HDL (High Desert Law)** — 1 project (Website Build). **Contract status expired.** Jill-owned.
6. **TAP** — 1 project (ERP Rebuild). Jason-owned, Tim-dev.
7. **Dave Asprey** — 1 retainer in wind-down, ends 2026-04-30 (<8 days from baseline date). 2 NULL Tasks. Allison-owned.
8. **Hopdoddy** — 2 projects, 1 is the "empty retainer wrapper" (no children, no L2s). Jill-owned.
9. **ABM** — 1 project (RFP Response). Pre-contract. Jill-lead.
10. **AG1** — 1 project (Social Content Trial). Pre-contract. Jill-lead, big team.
11. **Wilsonart** — 1 project (Chester Videos). NULL engagement_type.
12. **EDF** — 1 project (TBD). NULL engagement_type, no details.

Strategy for Phase 3:
- Post-compaction me should not re-run the full discovery. Read the baseline files first. The data shape is captured in `data-shape.md`. The known issues list is in `known-issues.md`.
- Run `pnpm runway:pull` to refresh snapshot before auditing.
- For each account, re-use the audit scripts in this dir against prod-fresh data.
- Hot sheet fetch pattern (when Convergix worked): operator provides Google Sheets URL → use `mcp__claude_ai_Google_Drive__read_file_content` with the file ID.
- Apply the question-drafting pattern operator + I landed on for Convergix: ground in hot sheet + Runway state, cluster related Projects, sub-questions per Project with conversational grounding.
- Respect terminology: Project = L1, Task/Phase = L2, no wrapper/parent_project_id jargon with staff.

## Phase 4 — CC #1 and CC #2 plan review

Blocked on operator sharing the primary TP's analysis docs + CC plans. Tasks #6 and #7 in my task list.

When those land:
- Fact-check every data-touching claim against the snapshot + schema.
- Do not rubber-stamp.
- CC #2 specifically needs deep audit of: field whitelist, DRY_RUN path vs APPLY path, UPDATED_BY uniqueness on retries, retainer-aware recompute EXISTS-subquery predicate, migration scaffolds.

## Cross-phase rules to carry forward

- No prod writes without explicit per-operation approval.
- Scratch scripts live in `docs/tmp/data-integrity-audit/` only.
- Env var names only, never values.
- Prod is actively changing during sessions. Re-pull before acting.
- When drafting for staff: Project/Task terminology, no jargon, code block output, no em dashes, no italics, conversational grounding lines before question bullets.
