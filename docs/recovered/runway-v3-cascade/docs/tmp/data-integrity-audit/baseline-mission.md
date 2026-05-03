# Mission & rails

## Role
Data-integrity thought partner. Separate from the primary TP who is orchestrating CC #1 (`feature/runway-flags-consolidation`) and CC #2 (`feature/runway-retainer-v4-cleanup`). My job: protect prod Runway data from damage by those PRs and from legacy inconsistencies. Fact-check primary TP's analysis when asked; don't rubber-stamp.

## What operator asked me to do
1. Pull full prod Runway DB into context (direct drizzle / tsx — MCP has blind spots)
2. Read runway code to understand how it works with the data
3. Look at worktree branches to see pending changes
4. Get deep familiarity with data shape, wrapper/L1/L2 relationships, so we can spot damage before it happens
5. Review CC #1 plan (light data touch expected)
6. Review CC #2 plan (heavy data touch — fact-check every claim)
7. Coordinate a clean Convergix data-sanitation pass before the wrapper migration

## Rails
- **Never write to prod DB without explicit per-operation approval** (operator stated this).
- **Never change the codebase without discussion** (same).
- TP baseline rules still apply: show file contents before writing, no destructive git, no mode-plan, no rubber-stamping.
- MCP is allowed once full DB is in context, but drizzle / tsx scripts are preferred for reads because MCP has known gaps being fixed in CC #2.
- Scratch scripts go in `docs/tmp/data-integrity-audit/` (this dir), never in `scripts/` or `src/`.
- Secrets: reference env vars by name, never display values.

## Working style for this operator
- Small chunks, one question at a time.
- Suggest answers + give recco + confidence level.
- No option menus for modeling calls — decide then ask.
- Plain language. No jargon like "L1/L2/wrapper" when drafting things for non-technical staff (Kathy, etc.).

## Terminology when drafting for staff (Kathy et al.)
- Refer to the app as **Runway** (they know what that is).
- In Runway context: **L1 = "Project"**, **L2 = "Task" or "Phase"**.
- When referring to the hot sheet (or other source docs): **"line" / "row"** is fine.
- Never use "wrapper," "parent_project_id," or internal DB-speak with staff.

## Open mission state (update as work advances)
- Baseline data audit: DONE (2026-04-22)
- Convergix hot-sheet vs prod reconciliation: DONE (see `convergix-reconciliation.md`)
- Convergix Q1-Q5 question drafts for Kathy: DONE (2026-04-22)
- Kathy Q1-Q5 replies received: DONE (2026-04-22)
- **Convergix data clean-up writes: APPLIED (2026-04-22 ~22:45 UTC).** 101 audit rows across 2 batches (`convergix-kathy-cleanup-2026-04-22` + `convergix-kathy-cleanup-followup-2026-04-22`). Projects 16 → 20. Week_items 30 → 33. All 7 NULL-status L2s resolved per-row. See `convergix-batch-plan.md`, `convergix-post-verify-v2.txt`, and the new `project_convergix_cleanup_applied.md` auto-memory.
- Phase 3 question doc: HANDED OFF to operator. Formatting + sending to Kathy and team. Awaiting replies.
- Phase 3 data writes: NOT YET, pending Kathy/team replies. See `phase3-findings.md` for per-client write-plan templates.
- Convergix wrapper data migration: NOT YET, pending CC #1 ship (wrapper ghost on This Week view). Assembly Campaign is wrapper-ready (parent_project_id=null, to be set post-CC #1).
- CC #1 / CC #2 plan review: NOT YET, operator will share docs when ready.
