# CC #1 review — data-integrity thought-partner

**Date:** 2026-04-23
**Plan reviewed:** CC #1 "Flags Consolidation" plan with TP's first-round feedback already folded in (Δ1-Δ4 resolved, blocked-semantic split preserved, option-a staleDays)
**Branch:** `feature/runway-flags-consolidation` (currently empty = `upstream/runway` at `219819c`)
**Reviewer role:** Data-integrity TP. Not the orchestrating TP. My job is protecting prod data; I evaluate CC plans for data-write risk, data-shape concerns, and gap-closure relative to the operator's logged asks.

---

## Headline verdict

**Approved on data dimensions with ride-along asks.**

- Zero prod data writes. Entire PR is read-path + detector logic + component refactor + one dormant filter.
- Phase D's `filterWrapperDayItems` closes my previously-flagged Week-view wrapper gap. Convergix wrapper migration is unblocked from the "nobody is building this filter" concern once CC #1 ships.
- Operator has asked for four additional items to ride on CC #1 (not a separate branch). I'm formalizing them below as scope additions — each has small surface area, fits the flag/read-path theme of this PR, and reduces the number of round-trip PRs we need to cover the 2026-04-23 logged directives.

---

## Per-phase data-integrity assessment

### Phase A — Types + data piping
- **Scope:** `TriageItem.updatedAt` + `TriageItem.parentProjectId` type additions; `page.tsx` passes `p.updatedAt?.toISOString() ?? null`.
- **Data touch:** None. Type-level + read-path plumbing.
- **Concern:** None.

### Phase B — stale_days orphan column fix
- **Scope:** Detector + two read helpers switch from `projects.stale_days` → `daysSince(projects.updated_at)`. Option-a: pipeline returns real `daysSince(updatedAt)` as `staleDays` field value.
- **Data touch:** None. Read-path only. `stale_days` column stays in schema (correctly out of scope for this PR).
- **Concern:** **Δ3-parallel is missing.** Plan has a Δ3 grep for `operations-reads-flags.ts` MCP consumers. Same grep is needed for `operations-reads-pipeline.ts`'s `staleDays` return field — option-a changes the semantic (was effectively 0 → now real day count). Any downstream reader (MCP tool, bot recipe) needs to expect real numbers now.

### Phase C — Merge PlateSummary into FlagsPanel
- **Scope:** New detectors `detectRetainerRenewals` + `detectContractExpired`. Strip pill helpers from `plate-summary.ts` (keep date helpers + `filterInFlight`). Delete `plate-summary.tsx` + its test. Δ3 gate for MCP consumers of `operations-reads-flags.ts`.
- **Data touch:** None. New detectors are read-only aggregations.
- **Concerns:**
  - **"Active" L1 enumeration should be an explicit Set.** Plan says "active includes blocked per TP billing-signal framing." Land as `CONTRACT_EXPIRED_ACTIVE_STATUSES = new Set(['in-production', 'awaiting-client', 'blocked', 'not-started'])` (mirrors `STALE_EXCLUDED_STATUSES` pattern). Excludes `on-hold` and `completed`. Comment the Why. Today only HDL fires — making this explicit in code matters when a second expired client shows up.
  - Retainer-renewal detector (retainer + `contract_end` within 30 days) will fire for Dave Asprey's 2026-04-30 wind-down today. Convergix wrapper (2026-07-31) won't fire until ~2026-07-01. Correct semantics.
  - `clients.contractStatus='expired'` is a valid enum (HDL carries it today per data-shape snapshot). Safe.

### Phase D — Hierarchy demotion detector + Week-view wrapper filter
- **Scope:** `detectHierarchyDemotions` (3-tier chain predicate: L1 has `parentProjectId` AND its parent also has `parentProjectId`). `filterWrapperDayItems(weekItems, accounts)` strips DayItems whose `projectId` matches a wrapper's id, where wrapper detection is "L1 is retainer AND another L1 in same account has `parentProjectId === l1.id`."
- **Data touch:** None. Read-path only.
- **Concerns:**
  - **Test coverage gap: retainer with zero children.** Add an explicit test for Hopdoddy Digital Retainer shape (`engagementType='retainer'`, no L1 references it as parent). Expected: NOT detected as a wrapper. Current predicate handles it correctly (`wrapperIds` stays empty), but prove it in a test so a future refactor doesn't regress.
  - **Wrapper-type assumption in comment.** Predicate assumes wrappers are always `engagementType='retainer'`. If we ever introduce a non-retainer wrapper (project-pack umbrella, etc.), this filter misses it. Document the assumption in a comment so future work knows to revisit.
  - **Ordering is safe.** Filter is dormant until wrapper rows exist in prod. CC #1 can ship first, then I do the Convergix wrapper migration. No ghost risk either way.

### Phase E — Exclude blocked from resource-conflict + TODO scaffolds
- **Scope:** Detector excludes blocked L2s from capacity demand. Three `// TODO(operator):` comments for pending decisions (window, secondary resources, multi-day dedupe).
- **Data touch:** None.
- **Concern:** None. Staffing-signal refinement. Kathy's count drops ~33 → ~11 — better signal for her.

---

## Items to add to CC #1 scope (per operator directive 2026-04-23)

Operator asked these four ride on CC #1 rather than opening a separate branch. Each has narrow surface area and fits the flag/read-path theme.

### Item 4A — By Account view: strip prices, wrapper-as-umbrella render, standalone marker

**Why:** Operator has asked "several times" for dollar amounts to not show on By Account view. Today Convergix card header shows $100,000, Beyond Petro shows $93,000. Prices belong on Pipeline view only (used by execs + AMs working deals). By Account is the "what's in play across accounts" view.

**Scope:**
- Remove price / total-contract-value rendering from the By Account client header (and any child card that surfaces a dollar value).
- Wrapper-as-umbrella: when a retainer wrapper exists in an account (L1 with `engagementType='retainer'` and ≥1 other L1 in that account has `parentProjectId === wrapper.id`), render the wrapper as the visible container above its nested L1s. Nested L1s render indented / attributed to the wrapper.
- Standalone-project marker: when a project is NOT under a wrapper but is under a retainer-capable client, mark it visually as "outside retainer scope." Edge case today: AUTOMATE Booth Design-style projects that aren't nested yet.

**Data touch:** None. Pure render changes in the By Account view component + any shared render helpers.

**Data-integrity relevance:** These renders consume the same data my wrapper migration will produce. Landing them now means the moment Convergix wrapper rows land, By Account view shows them correctly with no follow-up render PR.

**Note to CC:** This may need to land in a component I haven't surveyed. CC should identify the file (likely in `src/app/runway/components/` or the by-account section of `runway-board.tsx`) and add it to the owned list. No writes-layer or schema touch allowed.

### Item 4B — Needs Update: wrapper past contract_end surfacing

**Why:** Operator's locked logic for wrapper-level "close this retainer out" nudge. Distinct from Phase C's two new detectors:
- `retainer-renewal` (Phase C) = retainer with `contract_end` within 30 days. Pre-expiry warning.
- `contract-expired` (Phase C) = client-level `contractStatus='expired'`. Client metadata driven.
- **New `wrapper-close-out` detector = retainer wrapper where `contractEnd < today` AND `status === 'in-production'`.** Wrapper-level (above L1), post-expiry. Different signal, different row.

**Scope:**
- Add `detectWrapperCloseOut(accounts)` to `flags-detectors.ts`. Predicate: L1 with `engagementType='retainer'` AND at least one child L1 referencing it via `parentProjectId` AND `contractEnd < today()` AND `status === 'in-production'`.
- Extend `FlagType` in `flags.ts` with `wrapper-close-out`. Wire into `analyzeFlags`.
- Severity: WARNING (operator can promote to CRITICAL later if wrappers slip past by >14 days).
- **NOT automatic status change.** Data carries facts, UI provides the nudge. Operator manually flips wrapper to `completed` after wrap-up.

**Data touch:** None. New detector, same read-path pattern as Phase C.

**Data-integrity relevance:** This is the "safety net" that turns the locked wrapper metadata ("no auto-flip to completed") into a visible prompt. Without this detector, wrappers go silently stale after contract_end. With it, operator sees "Convergix Retainer contract ended, please close out" starting 2026-08-01.

**Test coverage:**
- Wrapper with `contractEnd` today + status in-production → fires (off-by-one check).
- Wrapper with `contractEnd` tomorrow + status in-production → does NOT fire.
- Wrapper with `contractEnd` past + status `completed` → does NOT fire (already closed out).
- Wrapper with `contractEnd` past + status in-production but NO children → does NOT fire (not acting as a wrapper; covered by standalone-retainer case).
- Standalone retainer with `contractEnd` past (Dave Asprey shape, no children) → does NOT fire here (fires via `contract-expired` if client is marked expired, otherwise silent — acceptable).

### Item 4C — get_retainer_team helper + MCP tool

**Why:** Bot can answer "what retainers do we have" and "what projects are under Convergix Retainer" via existing `get_projects` params. Cannot cleanly answer "who's on the Convergix Retainer team" — today LLM has to multi-step call + parse free-text `resources` strings + dedupe. This spec adds one helper + one MCP tool + system-prompt recipe to make it a single call.

**Scope (from `docs/tmp/data-integrity-audit/get-retainer-team-spec.md`, ~85 LOC):**
- New file `src/lib/runway/operations-reads-retainers.ts` with `getRetainerTeam(wrapperId)` function (returns deduplicated team roster across child L1s, plus wrapper's own owner as separate field).
- New file `src/lib/runway/operations-reads-retainers.test.ts` with the 6 test cases in the spec.
- Add `get_retainer_team` tool registration to `src/lib/slack/bot-tools.ts` (pattern matches `get_projects`).
- Add system-prompt recipe to `src/lib/runway/bot-context-sections.ts` (~8 lines).
- **Check:** if `src/lib/mcp/runway-tools.ts` exists as a separate tool list (not on CC #1's DO NOT TOUCH list — only `api/mcp/runway/**` is), mirror the registration there too. If it doesn't exist or isn't a separate list, skip.

**Data touch:** None. Read-only helper.

**Data-integrity relevance:** Ships ahead of the Convergix wrapper so the tool is live the moment wrapper rows land. Spec is harmless to ship ahead — `get_retainer_team` on a non-existent wrapperId returns `{ error: "Not a retainer wrapper" }`.

**Owned file surface update for CC #1:**
- ADD: `src/lib/runway/operations-reads-retainers.ts` (new)
- ADD: `src/lib/runway/operations-reads-retainers.test.ts` (new)
- ADD: `src/lib/slack/bot-tools.ts` (extend)
- ADD: `src/lib/runway/bot-context-sections.ts` (extend)
- ADD conditional: `src/lib/mcp/runway-tools.ts` (extend if exists as separate list)

### Item 4D — Re-confirm: no data writes in any of A/B/C

All three additions above are read-path. CC #1's "DO NOT touch operations-writes-*, scripts/runway-migrations, operations-utils" invariant stays. If any of these additions tempt CC to touch a writes-layer or migration path, that's a signal the scope is wrong — redirect to me.

---

## Proposed language for TP to feed back to CC #1

Below is what I'd like the primary TP to relay to CC #1. Operator approves / edits this before it goes to CC.

```
CC #1 — plan review feedback from data-integrity TP (round 2):

Data-integrity sign-off: your plan is approved on data dimensions. Zero prod
data writes. Phase D closes a gap we had (Week-view wrapper filter didn't
exist anywhere). Ship it.

Four ride-along additions, operator-confirmed, to land on this PR rather than
a separate branch:

1. Phase B Δ3-parallel: grep operations-reads-pipeline.ts's staleDays return
   field consumers the same way you're gating operations-reads-flags.ts.
   Option-a changes the value semantic (was effectively 0 → now real
   daysSince). Any downstream reader needs to expect real numbers. Report
   findings before committing Phase B.

2. Phase C contract-expired detector: land the "active" enumeration as a
   named Set constant (mirrors STALE_EXCLUDED_STATUSES pattern). Suggested:
   CONTRACT_EXPIRED_ACTIVE_STATUSES = new Set(['in-production',
   'awaiting-client', 'blocked', 'not-started']). Excludes on-hold and
   completed. Comment the Why.

3. Phase D wrapper filter: add two specific tests + one comment.
   - Test: retainer with zero children (Hopdoddy Digital Retainer shape) →
     NOT detected as wrapper, filter returns unchanged input.
   - Test: wrapper detection is idempotent across repeated calls (defensive,
     catches accidental mutation).
   - Comment on filterWrapperDayItems: document that wrapper detection
     assumes engagementType='retainer'. If we ever introduce a non-retainer
     wrapper, revisit this predicate.

4. Scope additions (data-integrity TP formalized these — each narrow, each
   read-only, each closes an operator-logged 2026-04-23 ask):

   4A. By Account view changes:
       - Remove price / dollar amounts from the client header and any child
         card. Today Convergix shows $100,000, Beyond Petro shows $93,000.
         Prices live on Pipeline view only.
       - Render retainer wrappers as the visible umbrella above their nested
         L1s (indent or attribute nested L1s to the wrapper card).
       - Visually mark standalone (non-wrapper) projects under retainer
         clients so they read as "outside retainer scope."
       Identify the files, add to owned surface list. No writes-layer or
       schema touch.

   4B. New detector detectWrapperCloseOut in flags-detectors.ts:
       - Predicate: L1 engagementType='retainer' AND ≥1 child references it
         via parentProjectId AND contractEnd < today() AND status =
         'in-production'.
       - Severity: WARNING.
       - Extend FlagType with 'wrapper-close-out'. Wire into analyzeFlags.
       - NOT automatic status change. UI nudge only.
       - Tests: off-by-one (contractEnd = today fires, = tomorrow doesn't);
         wrapper completed doesn't fire; standalone retainer (no children)
         doesn't fire here.

   4C. get_retainer_team helper + MCP tool. Full spec in
       docs/tmp/data-integrity-audit/get-retainer-team-spec.md. ~85 LOC.
       New files:
       - src/lib/runway/operations-reads-retainers.ts
       - src/lib/runway/operations-reads-retainers.test.ts
       Extend:
       - src/lib/slack/bot-tools.ts (tool registration)
       - src/lib/runway/bot-context-sections.ts (system-prompt recipe)
       - src/lib/mcp/runway-tools.ts only if it exists as a separate tool
         list (api/mcp/runway/** is still forbidden — that's the app route
         layer).
       Read-only helper. Ships ahead of wrapper safely.

   4D. Non-negotiable: operations-writes-*, scripts/runway-migrations/**, and
       operations-utils.ts stay on your DO NOT TOUCH list even with 4A-4C
       added. If any addition tempts you toward a writes-layer or migration,
       stop and flag — that's a data-integrity TP problem, not yours.

Restructure your plan into phases that accommodate these additions, keep the
per-phase lint + test:run gates, keep the post-code pipeline
(/preflight → code-review → /preflight → pr-ready → /atomic-commits) intact.
Expected ~5-6 atomic commits now instead of 4.

Report back: revised plan, phase-gate results, and the Δ3-parallel grep
findings before committing Phase B.
```

---

## My preferred ordering (informational, operator's call)

1. CC #1 ships with scope above. Merges to `runway`.
2. I re-pull prod DB (`pnpm runway:pull`) to capture any drift since 2026-04-22 ~22:45 UTC.
3. I execute the Convergix wrapper migration (create wrapper row — above-L1, in the `projects` table — with locked metadata + set `parentProjectId` on 17 active Convergix L1s + add retainer-renewal Task dated 2026-05-25).
4. I run post-migration verify: wrapper exists, children nested, By Account view renders wrapper-as-umbrella (visual check), Week view doesn't show the wrapper (filter activates), `get_retainer_team(wrapperId)` returns expected Convergix roster, `detectWrapperCloseOut` doesn't fire yet (contractEnd = 2026-07-31 is in the future).
5. CC #2's work proceeds on its own branch after.

Alternative ordering: if CC #2 has no overlap with wrapper code, both CCs can ship in parallel, wrapper migration rides on whichever merges first. I'll re-evaluate when I see CC #2's plan.

---

## Open flags / risks

- **Primary TP's "data updates TP thought were required" doc:** not yet shown to me. When operator shares it, I'll cross-walk every item against `worktree-diff-vs-upstream.md` "already applied" list + the locked Convergix wrapper metadata. Anything in TP's list that's already done gets struck. Anything not done that's a data write goes to my queue, not CC.
- **CC #2 plan unseen.** Cannot evaluate overlap between CC #1's Phase D wrapper filter and whatever CC #2 does until I see CC #2's scope.
- **`get_retainer_team` + `detectWrapperCloseOut` activation timing:** both are dormant until the wrapper exists in prod. If CC #1 ships and I delay the wrapper migration, both features are inert (not harmful). If something's broken in either, we only find out when wrapper lands. Mitigation: my post-wrapper-migration verify script explicitly calls `get_retainer_team(wrapperId)` and checks `detectWrapperCloseOut` fires for a synthetic past-end wrapper.
- **Schema drift since baseline:** snapshot is 2026-04-22 ~22:45 UTC. Operator flagged wrapper-related drift may have happened. I'll re-pull before the wrapper migration, not before CC #1 review — nothing in CC #1's scope needs current row data.
