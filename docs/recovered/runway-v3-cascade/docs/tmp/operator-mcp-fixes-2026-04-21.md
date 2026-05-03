# Operator MCP Fixes — 2026-04-21 Data Audit Follow-ups

**Source:** TP data-integrity audit, P1 findings.
**Scope:** Operator runs these via MCP. No code changes. Not part of any PR.
**Time estimate:** ~15 min total, sequential.

## 1. Convergix / Fanuc Award Article + LI Post — L1 status

**Current:** L1 `status='not-started'`, L2s blocked on client content.
**Fix:** L1 status → `awaiting-client`.
**MCP call:** `mcp__runway__update_project_status({ clientSlug: "convergix", projectName: "Fanuc Award Article + LI Post", status: "awaiting-client" })`
**Verify after:** project shows as awaiting-client on the board.

## 2. LPPC / Website Blog Posts — L1 status

**Current:** L1 `status='not-started'`, L2s blocked on client content.
**Fix:** L1 status → `awaiting-client`.
**MCP call:** `mcp__runway__update_project_status({ clientSlug: "lppc", projectName: "Website Blog Posts", status: "awaiting-client" })`
(Confirm exact project name before running — TP's audit used "Website Blog Posts"; verify via `mcp__runway__get_projects({clientSlug: "lppc"})` if uncertain.)

## 3. LPPC / MyLPPC Training Video — parent status update

**Context:** Child L2 flipped to `blocked` at 2026-04-20 23:06Z. L1 currently `on-hold`.
**Investigation needed BEFORE fix:** What did the child get blocked on? Is the L1 still genuinely on-hold, or should it reflect the active-but-blocked child state?
**Likely fix:** L1 status → `blocked` (mirrors child) OR `awaiting-client` (if the block is external).
**MCP call:** `mcp__runway__update_project_status({ clientSlug: "lppc", projectName: "MyLPPC Training Video", status: "<tbd after investigation>" })`
**Do not run without understanding the block source.**

## 4. Soundly / AARP Member Login + Landing Page — missing L2s

**Current:** L1 `engagementType='project'`, `status='in-production'`, `start_date=2026-04-17`, `end_date=2026-07-15`, **zero L2 children.**
**Context:** Tonight's retainer-v4-cleanup (C.1) added the contract dates on this L1 but no L2s exist to break the work into deliverables.
**Fix:** This is an intake task, not a status fix. Conversation with Allison or Jill needed to define the milestones between 2026-04-17 and 2026-07-15. Once defined, create L2s via `mcp__runway__create_week_item`.
**Do not run MCP here — block on intake conversation first.**

## After running all 4

- Gut-check the board at runway.startround1.com/runway.
- Note any new flags that appear (likely 0 new).
- The 4 fixes don't affect PR 89; they can run anytime without coordination.
