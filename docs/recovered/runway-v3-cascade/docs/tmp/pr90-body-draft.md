# PR 90 body draft — Wave 1 polish + retainer v4 cleanup + MCP surface expansion

**Title:** `Wave 1 polish + retainer v4 cleanup + MCP surface expansion`
**Base:** `runway`
**Head:** `feature/runway-retainer-v4-cleanup`
**Total commits:** 34

---

## Summary

Three layers of work rebased into one PR:

- **Wave 1 polish (4 commits):** cost / correctness / docs / UI polish from the holistic Runway review (2026-04-24). Bot model defaults to Haiku (12× cost reduction), TV dashboard's "today" indicator stops drifting at midnight, stale `target` field references scrubbed, `parentProjectId` filter added to `get_projects` docs, `getStaleWeekItems` O(n·m) → O(n+m) with a 30d update lookback, in-flight toggle gets an error path, list-key collisions fixed.
- **Retainer v4 + MCP surface expansion (14 commits):** PR 88 left `engagementType` / `contractStart` / `contractEnd` / `parentProjectId` writable but without value-level validators or MCP coverage; this PR closes that gap. Adds three new MCP tools (`override_project_date`, `set_project_parent`, `batch_apply`), a retainer-aware recompute guard (wrappers freeze startDate/endDate at SOW; child L1s recompute normally), a shared-module `parentProjectId` validator, a contract-date invariant, and lands the retainer v4 cleanup migration record (already applied to prod 2026-04-21).
- **Code-review follow-ups (16 commits):** post-rebase combined-branch code review surfaced one P1 (`batch_apply` bypass of tool-boundary value validators) plus a handful of P2/P3 cleanup items. Fully addressed: four boundary validators (engagementType / ISO date / week-item status / week-item category) hoisted into the same shared-module pattern as `validateParentProjectIdAssignment`, helper-level enforcement at every write path, MCP wrappers reuse the shared validators (no duplicated logic), real-helper integration tests for `batch_apply` rejection paths, test mocks now use `vi.importActual` so production validator changes propagate, docs synced (`runway.md` PROJECT_FIELDS + WEEK_ITEM_FIELDS, `mcp-runway-tools.md` update_week_item field enum), eslint config + gitignore cleanups.

## Why

- **Cost gap:** bot defaulted to Sonnet against CLAUDE.md's Haiku-by-default rule. Silent ~12× cost overrun.
- **Midnight bug:** `useMemo` on `todayStr` with empty deps memoized at mount; TVs running for days drifted off.
- **Docs drift:** `target` field had been removed but four references each in `docs/runway.md` and `docs/mcp-runway-tools.md` still pointed at it. `parentProjectId` filter (PR 88 Chunk F) wasn't in the params table.
- **Validator gap:** PR 88 added `engagementType` / `contractStart` / `contractEnd` / `parentProjectId` to the field whitelist but not value-level validators. `batch_apply` could dispatch directly to helpers, bypassing the wrapper-level enum and ISO-date checks. Field-name whitelist ≠ value validator. The new pattern follows `feedback_shared_validator_module`: validators in shared module, every write path reuses them.
- **Migration self-test went stale:** retainer-v4-cleanup's pre-check assertions captured the BEFORE state of an already-applied migration. After Cluster 2 + timestamp-correction landed 2026-04-24, those captures no longer matched live prod. Migration code unchanged; pre-check is `it.skip` with permanent stale-fixture marker.
- **Recompute guard:** retainer wrappers' `startDate` / `endDate` are SOW values, not derivable from L2s. Without the guard, any L2 write under a wrapper would silently overwrite the contract dates.

## Wave 1 (4 commits)

| sha | subject |
|---|---|
| `6ae834c` | fix(runway): default bot to Haiku (12x cost reduction) |
| `d0e3024` | fix(runway): today indicator stays current past midnight on TV dashboard |
| `b4d4d7f` | docs(runway): drop stale target field, document parentProjectId |
| `913f489` | fix(runway): UI polish — stale-items perf, toggle error path, list keys |

**Footprint:** 14 files, +191 / −28 LOC. **Tests:** +5 (midnight rollover, gte 30d lookback, nested-loop correctness, in-flight reject path, identical-title key collision).

## Retainer v4 + MCP expansion (14 commits)

| sha | subject |
|---|---|
| `23a2385` | feat(runway): support null-field writes in operations-writes helpers |
| `9ae72d2` | feat(runway): retainer v4 cleanup migration — 35 changes across 7 clients |
| `d14b1ce` | chore(runway): swap em-dashes to ASCII hyphens in retainer-v4-cleanup notes |
| `c344834` | fix(runway): route L1 endDate/startDate writes through raw-drizzle |
| `54d75a7` | feat(runway): pre-writes field-name validator for retainer v4 cleanup |
| `11dbf44` | fix(runway): raise trust-preservation threshold to 22:00Z post-revert |
| `e5ccc20` | fix(runway): refresh idempotency seed for retainer-v4-cleanup retry |
| `fc0abf8` | chore(runway): PR 88 hygiene + orphan validator |
| `ef61d49` | feat(runway): hotsheet-cleanup-2026-04-22 data correction script |
| `ee10240` | feat(runway): retainer-aware recompute guard (EXISTS L1 children) |
| `d05e56b` | feat(runway): MCP update_project_field + status hardening + parentProjectId validators + contract-date invariant |
| `596787d` | feat(runway): MCP add_project + week_item expansion |
| `5fc68e0` | feat(runway): MCP override_project_date + set_project_parent + batch_apply |
| `41e5102` | chore(runway): skip retainer-v4-cleanup pre-check assertions (one-shot migration) |

**Tests:** 219/219 writes/utils/validators/orphan + 111/111 MCP tool tests.

## Code-review follow-ups (15 commits)

The post-rebase code review on `41e5102` flagged P1 (`batch_apply` bypass) + P2/P3 cleanup. Addressed in two waves with re-audits between:

| sha | subject |
|---|---|
| `5a986b5` | feat(runway): hoist value validators to operations-utils |
| `95f434b` | feat(runway): wire project helpers to shared validators |
| `e9e716b` | feat(runway): wire week-item helpers to shared validators |
| `55b2194` | refactor(runway): MCP wrappers reuse shared validators (DRY) |
| `3a0c9e2` | fix(runway): drop duplicate EngagementType re-export |
| `e5fa078` | test(runway): rewrite batch_apply rejection tests as real-helper integration |
| `d70ffc8` | docs: sync PROJECT_FIELDS list to v4 (11 fields) |
| `ed3f871` | docs(scripts): document entry-point guard in orphan-check migration |
| `e4090cf` | chore: gitignore scripts/worktree-scratch/ local scratch dir |
| `48d2036` | chore: ignore scripts/worktree-scratch in eslint config |
| `d1210e9` | chore: gitignore docs/tmp/ local working files |
| `aa50d82` | test(runway): drop duplicate validator logic from test mocks (P2-A) |
| `093d472` | docs(runway): sync WEEK_ITEM_FIELDS list to v4 (12 fields) |
| `10d88eb` | test(runway): cover addProject validator-rejection paths (P3-C) |
| `ac8cc05` | docs(runway): sync update_week_item field enum to v4 |
| `eeb5d18` | test(runway): add real-filter coverage for stale-item 30d gte lookback |

**Validator architecture:** `validateEngagementType`, `validateIsoDateShape`, `validateWeekItemStatus`, `validateWeekItemCategory` (and the prior `validateParentProjectIdAssignment`) all live in `src/lib/runway/operations-utils.ts`, exported through the operations barrel, called from every helper write path AND every MCP wrapper boundary. Test mocks use `vi.importActual` so production validator changes propagate to the mocked test environment immediately. Load-bearing regression coverage: `src/lib/mcp/batch-apply-validators.test.ts` runs the four shared validators against real helpers with in-memory SQLite — would fail immediately if a validator were removed or weakened.

**Tests:** +51 new tests across CC #3/#6/#8 (validator unit tests + helper-level rejection tests + batch_apply integration tests + addProject rejection coverage + real-filter outcome coverage for the stale-item 30d gte lookback). Final suite: 2050 passing + 12 skipped (the 12 skips are the intentional one-shot migration pre-check assertions).

## Deployment notes

- **Bot model:** Sonnet → Haiku. 12× cost reduction. Behavior unchanged.
- **MCP surface:** three new tools (`override_project_date`, `set_project_parent`, `batch_apply`). `update_project_field` enum extended with `engagementType` / `contractStart` / `contractEnd` / `parentProjectId`. `create_week_item` / `update_week_item` field shapes expanded.
- **`batch_apply` value-validation:** every write path that accepts a value-validated field now enforces at the helper level, so `batch_apply`'s direct-dispatch path can no longer bypass enum / ISO-date checks. Defense-in-depth at the MCP wrapper boundary remains.
- **Recompute guard:** retainer wrappers (`engagement_type='retainer'` AND has children pointing via `parent_project_id`) freeze `startDate` / `endDate` at SOW. Child L1s under wrappers recompute from their L2s normally. Non-retainer L1s unchanged.
- **One-shot migration:** `scripts/runway-migrations/retainer-v4-cleanup-2026-04-21.ts` was applied to prod 2026-04-21. Its self-test `pre-check` assertions are `it.skip` with a permanent stale-fixture comment — captured BEFORE state of an already-applied migration, intentionally non-rerunnable. Migration code itself unchanged.
- **Schema:** no schema changes. `pnpm runway:generate` produces empty diff.
- **Tooling:** `scripts/worktree-scratch/` and `docs/tmp/` now gitignored. `scripts/worktree-scratch/` also added to eslint ignores. Preflight is now genuinely clean (no scratch noise polluting lint).

## Verification

- [ ] CI green on branch (lint/tsc/build/full test suite — already verified locally: 2050 passed + 12 skipped, 178 tsc baseline, 0 lint errors / 9 lint warnings, build green)
- [ ] Llama sweep clean
- [ ] Manual smoke: bot DM responds with Haiku, TV dashboard `Today` highlight rolls over within ~60s of midnight
- [ ] No new `runway:migrate` / `runway:push` invocations introduced

## Post-merge actions (Data TP coordination hook, ~1hr)

1. `runway:check-orphans` against prod as smoke test for the orphan validator script.
2. End-to-end recompute guard validation against wrapper id `4171aa4d88934d22b020d75fe` ("1H Convergix Retainer").
3. Fire Cluster 3 — retainer-renewal Task on the wrapper, weekOf 2026-05-25, owner / resources Kathy, category kickoff.

After post-merge coordination lands, Wave 2 (`feature/runway-concurrency-hardening` → PR 91) follows: AsyncLocalStorage replaces `_currentBatchId` module global, bot postMutationUpdate batch-guard, `_cachedClients` TTL race, Inngest runway-slack-message dedup.

## Known scope bounds (deliberately deferred)

- `engagementType` / `category` not added to `docs/mcp-runway-tools.md` `get_projects` params table or `update_project_field` field enum — intentional asymmetry; pre-existing scope items.
- Slack bot's `update_project_field` enum (`bot-tools.ts`) remains the narrower subset — pre-existing scope, predates PR 90.
- Wave 2 territory excluded: AsyncLocalStorage / batch-guard / TTL race / Inngest dedup.
- Wave 3 excluded: missing index audit, timezone canonicalization, helper consolidation, file splits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
