# CC Prompt — Wave 1 Polish Pass (Runway Holistic Review Follow-up)

**Branch:** `feature/wave1-polish` (created by `scripts/worktree wave1-polish` — cut from post-PR-89-merge `main`)
**Target PR:** Part 1 of PR 90 (will rebase with CC #2's branch before opening PR)
**Expected size:** ~100-150 LOC across ~10 files. One CC session.

## Context

PR #89 (`feature/runway-flags-consolidation`) just merged — flags detector consolidation, By Account refresh, `get_retainer_team` MCP tool, resource-conflict detector hardening.

A holistic code review of the full Runway codebase landed 2026-04-24 (`docs/tmp/runway-holistic-review-2026-04-24.md`). It surfaced 10 top findings across cost, correctness, docs, and UI. TP has split them into three waves:

- **Wave 1 (YOU):** cost + midnight bug + docs drift + UI polish. No file collision with CC #2.
- **Wave 2 (post-CC-#2):** AsyncLocalStorage for batch context + Inngest idempotency.
- **Wave 3 (later):** indexes, timezone canonicalization, helper consolidation, file splits.

Wave 1 and CC #2's retainer-v4-cleanup (`feature/runway-retainer-v4-cleanup`) develop in parallel, then rebase together at the end into PR 90. You will NOT open the PR yourself — TP handles the rebase + PR open after both branches land clean.

## Your role

- Enter plan mode (`/plan`), present a detailed implementation plan, exit via `ExitPlanMode` tool → TP reviews → operator approves.
- Build 4 focused commits covering cost fix, midnight fix, docs cleanup, UI polish.
- Tests woven into each commit, not deferred.
- Post-code pipeline (preflight + code-review + pr-ready + atomic-commits).
- Push branch to origin. Report back to TP. **Do NOT open a PR.**

## STEP 0: Worktree setup

You should already be in `.worktrees/wave1-polish` on branch `feature/wave1-polish` (created by `scripts/worktree wave1-polish`). Verify:

```bash
pwd                                   # expect .../.worktrees/wave1-polish
git status                            # expect clean
git rev-parse --abbrev-ref HEAD       # expect feature/wave1-polish
git log --oneline upstream/runway | head -3   # confirm PR #89 commits visible
```

If anything is off — wrong branch, dirty tree, or commits not visible — stop and report to TP before doing anything else.

## STEP 1: Enter plan mode

Invoke `/plan` to enter plan mode. Your plan must cover:

1. How you'll split the work into 4 commits (one per theme).
2. For each commit: files touched, LOC estimate, tests added/modified.
3. Ordering rationale (probably: cost fix → midnight → docs → UI polish, since cost is the fastest win).
4. Any questions for TP before you build (e.g., midnight fix strategy — inline vs date-change-aware re-render).
5. Acknowledge the 20-min Llama sweep is SKIPPED for this branch (combined PR 90 gets the sweep).

Present the plan. Exit via `ExitPlanMode` tool. TP reviews. Wait for operator approval before writing code.

## Owned file surfaces

- `src/lib/slack/bot.ts` (MODEL constant)
- `src/app/runway/runway-board.tsx` (todayStr memo)
- `src/app/runway/queries.ts` (getStaleWeekItems nested-loop fix + date filter)
- `src/app/runway/components/in-flight-toggle.tsx` (error handling)
- `src/app/runway/components/day-column.tsx` (list key fix)
- `src/app/runway/components/today-section.tsx` (list key fix)
- `src/app/runway/components/needs-update-section.tsx` (list key fix)
- `docs/runway.md` (target refs)
- `docs/mcp-runway-tools.md` (target refs + parentProjectId filter doc)
- Test files for UI components + queries (co-located)

## Do NOT touch (CC #2 owns these)

- `src/lib/mcp/runway-tools.ts` (CC #2 adds new MCP tools + enum expansions)
- `src/lib/runway/operations-writes-project.ts`
- `src/lib/runway/operations-writes-retainer.ts`
- `src/lib/runway/operations-reads-retainers.ts`
- `src/lib/runway/operations-utils.ts`
- `src/lib/slack/bot-tools.ts` (Wave 2 territory)
- Any new MCP tool sections in `docs/mcp-runway-tools.md` (CC #2 adds those — you only clean up existing `target` refs and add the `parentProjectId` FILTER doc)

## Tasks

### Commit 1: `fix(runway): default bot to Haiku (12× cost reduction)`

**File:** `src/lib/slack/bot.ts`

Change the MODEL constant from `claude-sonnet-4-6` to `claude-haiku-4-5-20251001`. One line.

**Verification:**
- Run `pnpm test:run` — confirm all existing bot tests still pass. If any assert on the model name, update to Haiku.
- No new tests required (constant change; existing coverage is sufficient).

**Why:** Project CLAUDE.md mandates Haiku default. Prompt caching + `recordTokenUsage` already wired. 12× cost multiplier burning money per Slack message.

### Commit 2: `fix(runway): today indicator stays current past midnight on TV dashboard`

**File:** `src/app/runway/runway-board.tsx` (line ~51)

`todayStr` is computed via `useMemo(() => new Date().toDateString(), [])` — captures at mount, never recomputes. TV dashboard runs for days without refresh; at midnight every "today" indicator becomes silently wrong.

**Fix (recommended):** Remove the `useMemo` — compute `new Date().toDateString()` on every render. It's a cheap op. This removes the memo layer entirely and recomputes each render. Update the two `useMemo` call sites (lines ~67 and ~76) that depend on `todayStr` — since `todayStr` becomes a plain const now computed per render, they'll still invalidate when the date string actually changes.

Alternative (if operator prefers) — add a `useDate()` hook that recomputes on a `setInterval` at midnight. More code, clearer intent. Propose both in plan mode; TP picks.

**Tests:** Add a test that verifies `toDateString()` output (a pure-JS concern — mock `Date` at two different dates and assert the filter behavior changes). Co-located in `runway-board.test.tsx` if exists, or add one.

### Commit 3: `docs(runway): remove stale target field + document parentProjectId filter`

**Files:** `docs/runway.md`, `docs/mcp-runway-tools.md`

Verified stale sites (grep before editing to confirm line numbers haven't shifted):

**`docs/runway.md`:**
- `:69` — remove `target` from `operations-add.ts` field list
- `:98` — remove `target` from PROJECT_FIELDS list
- `:331` — remove `target` from `create_project` description
- `:332` — remove `target` from `update_project_field` description

**`docs/mcp-runway-tools.md`:**
- `:132` — remove `"target": "2026-05-15"` from example JSON
- `:198` — remove `target` from `ProjectRow` return shape doc string
- `:213` — remove `"target": "2026-05-15"` from example response JSON
- `:1035` — remove `target` from `update_project_field` field enum doc row

**ADD `parentProjectId` filter to `get_projects` params table (around line 186):**
Check the existing params table format and add a row like:
```
| `parentProjectId` | string | no | Filter to children of a specific retainer wrapper (pass parent project id). Pass `"__null__"` to find top-level (unparented) projects. |
```
Look at `runway-tools.ts:113-122` for the current MCP input shape to confirm the exact filter name + null-marker convention.

**Tests:** None required — documentation change. Verify with a final `grep -rn "target" docs/runway.md docs/mcp-runway-tools.md` returning 0 hits (other than unrelated uses of the word "target" in prose).

### Commit 4: `fix(runway): UI polish — stale-items perf, toggle error path, list key collisions`

**Files:**
- `src/app/runway/queries.ts`
- `src/app/runway/components/in-flight-toggle.tsx`
- `src/app/runway/components/day-column.tsx`
- `src/app/runway/components/today-section.tsx`
- `src/app/runway/components/needs-update-section.tsx`
- Co-located test files

**Sub-task 4a — `queries.ts:210-219` O(n·m) nested loop fix:**
`getStaleWeekItems` currently iterates `recentUpdates × pastItems` to match updates to items. Build a `Map<itemKey, latestUpdate>` in one O(n) pass first, then iterate past items and do O(1) lookups. Pick a key that's unique per item (inspect the code — probably `${account}|${title}` or `itemId` if available).

**Sub-task 4b — `queries.ts:203-206` date-filter scope on updates:**
Current `getStaleWeekItems` fetches all updates with no date filter — full-table read on every page load. Add a lookback window (30 days default):
```ts
.where(gte(updates.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
```
Use the date constant from `src/lib/runway/date-constants.ts` if one exists for 30d.

**Sub-task 4c — `in-flight-toggle.tsx:38-40` error handling:**
Current:
```tsx
startTransition(async () => {
  await onToggle(next);
});
```
Wrap in try/catch. On reject, revert the optimistic state (call `setOptimistic(prev)`) and show a toast or error indicator. If no toast lib is wired up for the runway UI, log to console + revert; don't introduce a new dep.

**Sub-task 4d — list key collisions in `day-column.tsx:34`, `today-section.tsx:31`, `needs-update-section.tsx:37`:**
All three use `${item.title.slice(0, 20)}-${index}` as a React key. Two items with similar titles collide. Replace with:
```tsx
key={item.id ?? `${item.account}|${item.title}|${index}`}
```
Mirror the fallback pattern used in `detectPastEndL2s` in flags-detectors.ts (composite key when id is absent).

**Tests (woven in, not deferred):**
- `queries.test.ts`: add a test that seeds 50 updates + 20 past items, asserts `getStaleWeekItems` returns correct matches AND that the function is called with a date-filtered query (mock the drizzle `where` clause or inspect the SQL).
- `queries.test.ts`: add a test for the lookback window — items from 60d ago should NOT match.
- `in-flight-toggle.test.tsx`: add a test where `onToggle` rejects; assert optimistic state reverts.
- List-key fix: add a test using React Testing Library that renders 2 items with identical titles but different ids; assert both render (if keys collided, React would warn and one might not render).

## Gates (run in order)

After all 4 commits:

1. **`/preflight`** — build + tests + lint clean. Fix any failures.
2. **`/code-review`** — skill runs full review. Address any P0/P1 issues. Ignore P2 style-only preferences.
3. **`/preflight`** again — confirm still clean after review fixes.
4. **`/pr-ready`** — run the PR-ready skill. Confirms no debug statements, unused imports, dead code.
5. **`/atomic-commits`** — if commits drifted or got messy, re-split. 4 logical commits.

## Push + do NOT open PR

```bash
git push -u origin feature/wave1-polish
```

**Do NOT run `gh pr create`.** TP handles PR 90 open AFTER CC #2's branch also lands clean and both are rebased together. Your branch should just exist cleanly on origin.

## Report back to TP

Post:
- Commit hashes (4 commits expected)
- Test count delta (before → after)
- Any P0/P1 code-review issues addressed
- Any surprises or judgment calls
- Confirmation: branch pushed, NO PR opened
- Explicit confirmation: worktree NOT on `feature/runway-retainer-v4-cleanup` or `feature/runway-flags-consolidation`

## Do NOT

- Open a PR — TP handles PR 90 assembly
- Run a 20-min Llama wait — defer to PR 90
- Touch CC #2's owned surfaces (see Do NOT touch list above)
- Add `set_batch_mode` or `get_week_items_by_project` to bot-tools — Wave 2 territory
- Touch `operations-utils.ts` or any file in `src/lib/runway/` — except `queries.ts` in the UI layer path
- Add new MCP tool docs — CC #2 adds those; you only clean existing `target` refs + add the `get_projects` `parentProjectId` FILTER doc

## DO NOT REPEAT (post-compaction recovery)

If you compact mid-session:
- This doc (`docs/tmp/wave1-polish-cc-prompt-2026-04-24.md`) is your re-entry point
- Check `git log --oneline -6 feature/wave1-polish` for commit progress
- Check `git status` for pending work
- Don't re-plan: if `ExitPlanMode` was already approved, proceed with remaining commits
- Ask TP before re-running any pipeline step that already completed
