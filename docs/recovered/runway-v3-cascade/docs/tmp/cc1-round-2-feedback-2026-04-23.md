# CC #1 Round-2 Feedback — 2026-04-23

**To:** CC #1 (`feature/runway-flags-consolidation`, currently in `/plan` mode with revised plan at `docs/tmp/cc1-flags-consolidation-plan.md`).
**From:** TP + data-integrity TP (joint review after fresh 2026-04-23 prod snapshot).
**Action:** Fold these into your plan. Re-present via `ExitPlanMode`. Wait for operator greenlight.

---

## Context

Round-1 feedback landed in `docs/brain/tp-cc1-plan-review-2026-04-22.md`. You folded those in correctly (Δ1-Δ4 resolved, blocked-semantic split preserved, option-a staleDays). Round-2 is narrower but expands scope with 4A/4B/4C to close three operator-logged 2026-04-23 asks on this PR instead of a follow-up PR.

Data-integrity TP reviewed your plan independently against fresh prod (2026-04-23T15:19 UTC) and signs off on data dimensions (zero prod data writes; Phase D wrapper filter closes the Week-view ghost gap). Full review: `docs/tmp/data-integrity-audit/cc1-review.md`.

Operator locks (2026-04-23): wrapper `startDate`/`endDate` explicit = `2026-02-01`/`2026-07-31`, `sort_order=0`, `category="active"`, `resources=NULL`. Wrapper name `"Convergix Retainer"` (no dates in name). These don't change your PR — they're downstream data-integrity TP's. Listed here for cross-session coherence.

---

## A. Tightening asks (land regardless of scope expansion below)

### A1. Phase B Δ3-parallel grep on pipeline consumers

Your plan already has a Δ3 gate grepping `operations-reads-flags.ts` consumers for pill-shape preservation. Same grep is needed for `operations-reads-pipeline.ts`'s `staleDays` return field.

**Why:** Option-a changes the pipeline's returned `staleDays` semantic. Before: always `0` (orphan read). After: real `daysSince(updatedAt)` integer. Any downstream reader (MCP tool, bot recipe, UI badge) that silently depended on `0` as a sentinel will now see variable integers.

**Action:** Grep consumers of `operations-reads-pipeline.ts` `staleDays` field across `src/lib/slack/bot-tools.ts`, `src/lib/mcp/runway-tools.ts`, `src/app/api/mcp/runway/*` (HTTP transport — read-only grep), UI components. Report findings to TP BEFORE committing Phase B. If any consumer reads `0` as a "hide when zero" sentinel, preserve via a local mapper or flag for update.

### A2. Phase C `contract-expired` — explicit Set constant

Your plan says `"'active' includes blocked per TP billing-signal framing"` but implements inline. Land as a named Set constant to mirror the `STALE_EXCLUDED_STATUSES` pattern:

```ts
const CONTRACT_EXPIRED_ACTIVE_STATUSES = new Set([
  "in-production",
  "awaiting-client",
  "blocked",
  "not-started",
]);
// Excludes "on-hold" and "completed". "blocked" counts as active for the
// billing signal — dormant-but-alive work still counts against an expired
// contract. Different from staffing signal (Phase E excludes blocked).
```

Comment the Why so a future refactor doesn't regress.

### A3. Phase D wrapper-detection — extra tests + comment

Add two tests + one comment to Phase D:

1. **Retainer with zero children** (Hopdoddy Digital Retainer shape): `engagementType="retainer"`, no L1 references it as parent. Expected: NOT detected as a wrapper; `filterWrapperDayItems` returns unchanged input. (Predicate handles this correctly today via empty `wrapperIds`; prove it in a test so a future refactor doesn't regress.)

2. **Idempotent calls:** `filterWrapperDayItems(weekItems, accounts)` called twice on the same inputs returns structurally-equal output. Catches accidental mutation.

3. Add a comment to `filterWrapperDayItems`:
   > Wrapper detection assumes `engagementType === "retainer"`. If a non-retainer wrapper pattern is introduced (project-pack umbrella, etc.), revisit this predicate.

---

## B. Scope additions — 4A / 4B / 4C (operator-approved 2026-04-23)

Operator directive: these ride on CC #1 instead of a follow-up PR. Each is narrow, read-path, closes an operator-logged ask. Expected commit count: 4 → ~6.

### 4A. By Account view — strip prices, wrapper-as-umbrella render, standalone marker

**Why:** Operator has asked multiple times that dollar amounts not appear on By Account view. Today Convergix card header shows $100,000, Beyond Petro shows $93,000. Prices belong on Pipeline view only (execs + AMs working deals). By Account is the "what's in play across accounts" view.

**Scope:**
- **Strip prices:** Remove price / total-contract-value rendering from the By Account client header and any child card surfacing a dollar value.
- **Wrapper-as-umbrella:** When a retainer wrapper exists in an account (L1 with `engagementType === "retainer"` and ≥1 other L1 in that account has `parentProjectId === wrapper.id`), render the wrapper as the visible container above its nested L1s. Nested L1s render indented or attributed to the wrapper.
- **Standalone marker:** When a project is NOT under a wrapper but IS under a retainer-capable client, mark it visually as "outside retainer scope" (edge case today: AUTOMATE Booth Design-style projects not yet nested).

**Data touch:** None. Pure render changes.

**Action:** Grep for the By Account render path (likely `src/app/runway/components/by-account-section.tsx` or similar). Report the file(s) identified in your revised plan. Add to owned-file surface list. No writes-layer, no schema, no `operations-utils.ts`.

**Why now:** Cluster 2 (data-integrity TP's wrapper migration) runs post-CC-#1-merge. Landing the render now means the moment wrapper rows land in prod, By Account view displays them correctly with no follow-up render PR.

### 4B. `detectWrapperCloseOut` — wrapper past contract_end nudge

**Why:** Operator's locked logic for wrapper-level "close this retainer out" nudge. Distinct from Phase C's two new detectors:
- `retainer-renewal` (Phase C) = retainer with `contract_end` within 30 days. **Pre-expiry** warning.
- `contract-expired` (Phase C) = client-level `contractStatus="expired"`. Client-metadata driven.
- **`wrapper-close-out` (4B)** = retainer wrapper where `contractEnd < today` AND `status === "in-production"`. Wrapper-level, **post-expiry**. Different signal, different row.

**Scope:**
- Add `detectWrapperCloseOut(accounts)` to `src/lib/runway/flags-detectors.ts`. Predicate: L1 with `engagementType === "retainer"` AND ≥1 child L1 references it via `parentProjectId` AND `contractEnd < today()` AND `status === "in-production"`.
- Extend `FlagType` in `src/lib/runway/flags.ts` with `"wrapper-close-out"`. Wire into `analyzeFlags`.
- Severity: WARNING.
- **NOT automatic status change.** Data carries facts; UI nudges; operator manually flips wrapper to `completed` after wrap-up.

**Tests:**
- Wrapper with `contractEnd === today` + `status === "in-production"` → fires (off-by-one check)
- Wrapper with `contractEnd === tomorrow` + `status === "in-production"` → does NOT fire
- Wrapper with `contractEnd < today` + `status === "completed"` → does NOT fire (already closed out)
- Wrapper with `contractEnd < today` + `status === "in-production"` but 0 children → does NOT fire (not acting as a wrapper; standalone retainer handled by `contract-expired` if client marked expired)

**Data touch:** None.

### 4C. `get_retainer_team` helper + MCP tool

**Why:** Bot can already answer "what retainers do we have" and "what projects are under Convergix Retainer" via `get_projects`. Cannot cleanly answer "who's on the Convergix Retainer team" — today that requires multi-step fetch + free-text `resources` parsing + fuzzy dedupe. This adds one helper + one MCP tool + system-prompt recipe.

**Full spec:** `docs/tmp/data-integrity-audit/get-retainer-team-spec.md`. ~85 LOC total (helper + tests + tool reg + recipe).

**Files:**

*NEW:*
- `src/lib/runway/operations-reads-retainers.ts` — `getRetainerTeam(wrapperId)` function.
- `src/lib/runway/operations-reads-retainers.test.ts` — 6 test cases per spec (zero children; 3 children sharing 2/3 team; NULL owner/resources; mixed role prefixes; non-retainer rejection; non-existent wrapperId).

*EXTEND:*
- `src/lib/slack/bot-tools.ts` — register `get_retainer_team` tool (~10 lines, matches `get_projects` pattern).
- `src/lib/runway/bot-context-sections.ts` — add system-prompt recipe (~8 lines per spec).
- `src/lib/mcp/runway-tools.ts` — mirror tool registration. **Note on DO NOT TOUCH:** `api/mcp/runway/**` is the HTTP transport (still forbidden). `src/lib/mcp/runway-tools.ts` is the MCP tool definitions (OK to extend).

**Data touch:** None.

**Why safe to ship ahead:** On a non-existent `wrapperId`, `getRetainerTeam` returns `{ error: "Not a retainer wrapper" }`. Harmless until wrapper rows land.

### 4D. Non-negotiable scope boundary

All 4A/4B/4C additions are read-path. Your DO NOT TOUCH list stays exactly:
- `src/lib/runway/operations-writes-*.ts`
- `scripts/runway-migrations/**`
- `src/lib/runway/operations-utils.ts`
- `src/lib/runway/mutation-response.ts`
- `src/app/api/mcp/runway/**` (HTTP transport)

If any 4A-4C addition tempts you toward a writes-layer or migration path, **stop and flag** — that's a data-integrity TP problem, not yours.

---

## Revised owned-file surface (additive to your round-1 plan)

*ADD to modify list:*
- By Account render path (4A — grep during plan mode; likely `src/app/runway/components/by-account-section.tsx`)
- `src/lib/slack/bot-tools.ts` (4C tool registration)
- `src/lib/runway/bot-context-sections.ts` (4C system-prompt recipe)
- `src/lib/mcp/runway-tools.ts` (4C MCP tool registration)

*ADD to new-file list:*
- `src/lib/runway/operations-reads-retainers.ts` (4C helper)
- `src/lib/runway/operations-reads-retainers.test.ts` (4C tests)

*No changes to round-1 owned files.* `plate-summary.ts` stays stripped-not-deleted per Δ1.

---

## Revised commit plan

4 → ~6 atomic commits. Final split decided by `/atomic-commits`. Suggested mapping:

1. `fix(runway): stale_days orphan column read in detectors + reads` (Phase A + B; includes A1 Δ3-parallel grep findings)
2. `refactor(runway): merge PlateSummary into FlagsPanel` (Phase C; includes A2 `CONTRACT_EXPIRED_ACTIVE_STATUSES` Set)
3. `feat(runway): hierarchy demotion detector + Week-view wrapper filter` (Phase D; includes A3 extra tests + comment)
4. `fix(runway): exclude blocked from resource-conflict + scaffold 3 spec TODOs` (Phase E)
5. `feat(runway): By Account view — strip prices, wrapper-as-umbrella render, standalone marker` (4A)
6. `feat(runway): wrapper-close-out detector + get_retainer_team MCP tool` (4B + 4C combined — or split if `/atomic-commits` prefers)

---

## Execution flow (unchanged)

- `/plan` mode is active. Fold round-1 + round-2 feedback. Re-present via `ExitPlanMode`.
- After operator greenlight: execute phases with per-phase `pnpm lint` + `pnpm test:run` gates.
- End-of-coding: `/preflight` → read code-review skill, follow manually → `/preflight` again → read pr-ready skill, follow manually → `/atomic-commits` → `gh pr create`.
- Post-PR: wait 20 minutes → Llama sweep via `gh pr view <url> --comments` + `gh api repos/<org>/<repo>/pulls/<N>/comments` → fix any issues with new commits on same branch.
- Operator merges (NOT you). No `--force-push`.

---

## Report back to TP

- Final commit hashes (post `/atomic-commits`)
- Per-phase gate results
- **A1 grep findings** for `operations-reads-pipeline.ts` staleDays consumers — BEFORE Phase B commit
- **Δ3 grep findings** (round 1) for `operations-reads-flags.ts` MCP pill-shape consumers — BEFORE Phase C commit
- **4A By Account render-path file(s) identified** in plan mode
- **4C `src/lib/mcp/runway-tools.ts`** — tool registration mirrored there? Report the exact additions.
- `/preflight` results (both runs)
- code-review findings + fixes
- pr-ready findings + fixes
- PR URL
- Llama sweep result (clean or addressed)
- Before/after screenshots of right-rail Flags panel AND By Account view
