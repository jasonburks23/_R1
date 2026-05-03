# CC #2 — Clean Fire Prompt (paste into CC #2 terminal via option 4)

You are CC #2. Your branch is `feature/runway-retainer-v4-cleanup`. Your worktree is `/Users/jasonburks/Documents/_AI_/_R1/.worktrees/runway-v3-cascade`. Stay there.

## Why this prompt supersedes your initial plan

You presented an initial plan in `/plan` mode. TP and Data-Integrity TP have ratified the scope, but ONE scope change must be folded in before you exit plan mode. Re-enter `/plan` mode with this prompt as authoritative. Your full task detail lives at `docs/tmp/cc2-clean-prompt-2026-04-22.md` — read that file in full first, THEN apply the deltas below.

## Prod state (post-PR-89-merge, 2026-04-24)

PR 89 merged 2026-04-24. Two prod data ops have landed via Data-Integrity TP's rails since:

1. **Cluster 2 APPLIED clean** — batch `convergix-wrapper-create-2026-04-24`, 34 audit rows. New wrapper id `4171aa4d88934d22b020d75fe`, name **"1H Convergix Retainer"** (NOT "Convergix Retainer"). Convention: `<1H|2H> Convergix Retainer` per contract half. 16 active L1s parented to wrapper, 4 completed L1s left unparented per strict "completed = excluded" rule.
2. **Timestamp-correction APPLIED clean** — batch `timestamp-correction-2026-04-24`, 18 field corrections. Zero ms-encoded timestamps remain in `projects` or `week_items` system-wide.

Current state: 50 projects total, zero orphan parentProjectIds, zero ms-encoded timestamps.

## CRITICAL SCOPE ADDITION — parentProjectId validator placement

Your authoritative prompt's commit 11 says to add backend validators in `operations-writes-project.ts` (parent exists, retainer parent, same `client_id`, 10-hop cycle walk). Data-Integrity TP added a non-negotiable requirement on top:

**The four parentProjectId validators MUST land in a shared module — `operations-utils.ts` or a new helper file — NOT buried inside `set_project_parent`'s handler.**

**The existing `updateProjectField` code path's `parentProjectId` branch MUST reuse those same validators.**

Reason: today, a direct `updateProjectField({ field: "parentProjectId", newValue: X })` bypasses every check because `parentProjectId` sits in the `PROJECT_FIELDS` whitelist with no value-level validation. If validators live only in `set_project_parent`'s handler, the existing helper path stays unguarded and someone can set a cycle, cross-client parent, or non-retainer parent through the older API.

**Every write path that sets `parentProjectId` must run the same shared validators.** Test coverage must hit BOTH the new `set_project_parent` MCP tool path AND the existing `update_project_field` path going through the same parentProjectId → expect both to reject the same invalid inputs (cycle, non-retainer parent, cross-client parent, non-existent parent).

If your initial plan put validators handler-local in `set_project_parent`, that's the change to make. If your initial plan already put them in a shared module + reused them in `updateProjectField`'s parentProjectId branch, confirm that explicitly in your re-presented plan.

## Parallel track awareness — Wave 1 polish

A second CC session (Wave 1) is firing in a separate worktree at the same time as you. You will NOT see their commits during your session. They own:

- `src/lib/slack/bot.ts` (model constant)
- `src/app/runway/runway-board.tsx` (midnight memo)
- `src/app/runway/components/queries.ts`
- `src/app/runway/components/in-flight-toggle.tsx`
- `src/app/runway/components/day-column.tsx`
- `src/app/runway/components/today-section.tsx`
- `src/app/runway/components/needs-update-section.tsx`
- `docs/runway.md` (4× target scrubs)
- In `docs/mcp-runway-tools.md`: 4× `target` line refs (132, 198, 213, 1035) AND adding a `parentProjectId` filter doc to `get_projects` params

**Do NOT touch any of those files.** Your owned surfaces are unchanged from the authoritative prompt.

In `docs/mcp-runway-tools.md`, you own: new sections for `override_project_date`, `set_project_parent`, `batch_apply`, plus enum expansions on `update_project_field` / `update_project_status` / `add_project` / `update_week_item` / `create_week_item`. Wave 1 owns the 4× `target` line scrubs and the `parentProjectId` filter doc on `get_projects`. Boundaries are clean.

TP handles the rebase of your branch onto Wave 1's branch at the end.

## What you do NOT do

- **Do NOT open a PR.** No `gh pr create`. TP opens PR 90 from the rebased combined branch.
- **Do NOT run a Llama sweep on your branch.** Llama runs once, on PR 90 after rebase + open.
- **Do NOT run any migration.** No `runway:migrate`, no `runway:push`, no prod-write scripts. All prod data writes go through Data-Integrity TP's rails. `runway:generate` is fine — it's read-only compare for the schema-drift gate.
- **Do NOT touch Wave 1's owned surfaces** (listed above).
- **Do NOT write any test that hits prod Turso.** `test-db.ts` pattern is mandatory. If an assertion genuinely needs prod contact, stop and flag to TP per-test.
- **Do NOT use `git add -A`.** Explicit `git add <file>` per file.
- **Do NOT amend the 7 retainer commits during rebase.**

## What you do at the end

When all 13 commits land + gates green (lint / tsc / build / test / schema-drift) + post-code pipeline clean (preflight → code-review → preflight → pr-ready → atomic-commits):

1. Push: `git push -u origin feature/runway-retainer-v4-cleanup`
2. Report back to TP with:
   - All 13 commit hashes
   - Gate 1-8 results + baseline flags
   - Rebase actual conflict count + resolution notes
   - engagementType enum values found in prod (from Task 5 prep)
   - fe228da cherry-pick tsc check result
   - preflight (both runs) + code-review + pr-ready findings + fixes
   - Schema-drift gate confirmed empty
   - Confirmation: parentProjectId validators are in a shared module + reused by `updateProjectField` (call out the file + line range)
   - Confirmation: tests cover validator reject paths through BOTH `set_project_parent` AND `update_project_field` parentProjectId branch
   - Confirmation: `check-orphan-parent-project-ids.ts` tested against test-db (seeded orphans → non-zero exit; clean → 0 exit)
   - Confirmation: recompute guard test-db coverage demonstrates wrapper-with-children + child L2 date write → wrapper `startDate`/`endDate` hold frozen (not recomputed to child's values)
   - Confirmation: zero `runway:migrate` / `runway:push` / prod-write invocations anywhere in the diff
3. Wait for TP to handle rebase + PR 90 open

## Re-enter plan mode

Read `docs/tmp/cc2-clean-prompt-2026-04-22.md` in full (your authoritative prompt — all 13 commits, file surfaces, gates, post-code pipeline, etc.).

Then invoke `/plan`.

Re-derive your detailed implementation plan with the validator-placement constraint above folded in. When ready, call `ExitPlanMode` with the plan summary. TP will grep-verify every technical claim before operator approves. Verification discipline from 2026-04-23 is active — TP will check:

- Validator placement (shared module, not handler-local)
- `updateProjectField` parentProjectId branch reuses shared validators
- `PROJECT_FIELDS` not re-extended (already has all four fields per PR 88)
- MCP enum additions are `engagementType` / `contractStart` / `contractEnd` only (parentProjectId already present at `runway-tools.ts:429`)
- All new MCP tools (`override_project_date`, `set_project_parent`, `batch_apply`) tested against test-db only
- Zero prod-write invocations anywhere

Fire.
