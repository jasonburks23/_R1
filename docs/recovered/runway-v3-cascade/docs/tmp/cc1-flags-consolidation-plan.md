# CC #1 — flags-consolidation plan (POST-PR state)

**Status:** PR #89 opened 2026-04-23 → https://github.com/Hunt-Gather-Create/_R1/pull/89
**Branch:** `feature/runway-flags-consolidation` (3 commits: c5e6a01, 84c9cb0, c1b8164)
**Plan file (approved):** `~/.claude/plans/wild-sauteeing-wigderson.md`
**Original pre-plan:** archived below as "Pre-plan history" for TP continuity record.

---

## Planned vs built delta

### What landed as planned

- ✅ **Phase A** — TriageItem extended with `updatedAt`; page.tsx pipes `p.updatedAt?.toISOString()`.
- ✅ **Phase B** — `detectStaleItems` reads `updatedAt` via new `daysSinceUpdatedAt` helper. `operations-reads-health.staleProjectsCount` + `operations-reads-pipeline.getStaleItemsForAccounts` switched off orphan `stale_days`. Pipeline now returns real `daysSince(updatedAt)` integers (option-a per TP).
- ✅ **Phase C** — two new detectors (`detectRetainerRenewals`, `detectContractExpired`), `CONTRACT_EXPIRED_ACTIVE_STATUSES` Set with Why-comment, FlagType + analyzeFlags wiring, PlateSummary component deleted, runway-board unmount, right-rail flag-panel tests added.
- ✅ **Phase D** — `detectHierarchyDemotions`, console.warn replaced with silent skip, `filterWrapperDayItems` + `wrapperIds` + `accountHasWrapper` in unified-view, applied in page.tsx before analyzeFlags + RunwayBoard.
- ✅ **Phase E** — `RESOURCE_CONFLICT_EXCLUDED_STATUSES` Set (mirrors STALE/BOTTLENECK pattern), blocked excluded, 3 `TODO(operator)` comments inlined.
- ✅ **Phase 4A** — `contractValue` render stripped, "Outside retainer" marker added with `outside-retainer-marker` data-testid, synthetic wrapper regression test (1 wrapper + 3 children).
- ✅ **Phase 4B** — `detectWrapperCloseOut` with `contractEnd < todayISO` boundary (handoff to `detectRetainerRenewals` on boundary day).
- ✅ **Phase 4C** — `getRetainerTeam` helper with the full `RetainerTeamResult` spec shape, 6 test cases, registered in bot-tools + mcp/runway-tools, system-prompt recipe added to bot-context-sections.

### Deviations from plan

**Δ3 — pill shape preservation (parallel surfaces instead of strip + mapper).** Plan said "switch `operations-reads-flags.ts` imports + strip plate-summary retainer/contract helpers." Actual execution kept `plate-summary.ts retainerRenewalPills / contractExpiredPills` intact and added parallel `detectRetainerRenewals / detectContractExpired` in flags-detectors that emit `RunwayFlag[]`. Reason: Δ3 gate grep found 8+ consumers (operations-reads-flags return, bot-tools.ts tool description, mcp/runway-tools.ts description, bot-context-sections.ts system prompt, 7 test files) depending on the pill shape. Stripping would have forced a mapper + touched `operations-reads-flags.ts` in a risky way. Parallel-surface approach aligned both via the shared `CONTRACT_EXPIRED_ACTIVE_STATUSES` Set import.

**Widened CONTRACT_EXPIRED_ACTIVE_STATUSES semantic.** Old `plate-summary.ACTIVE_L1_STATUSES` was `{in-production, not-started}` + inline blocked check = effectively `{in-production, not-started, blocked}`. TP's A2 Set adds `awaiting-client`. Since `contractExpiredPills` now imports the shared Set, the MCP pill surface picks up the widened semantic. No existing pill test asserted `awaiting-client`-negative, so no breakage.

**Commit count: 3 instead of ~6.** Heavy interleaving of `flags.ts`, `flags-detectors.ts`, `flags-detectors.test.ts` across 5 phases (each file touched 4-5 times) made per-Phase hunk splitting error-prone. 3 logically cohesive commits chosen instead: detector consolidation (Phase A/B/C/D/E/4B library layer), UI refresh (Phase 4A + page.tsx wrapper filter + PlateSummary unmount), MCP/bot integration (Phase 4C). `page.tsx` was the only file split mid-commit via Edit/checkout.

**Worktree scratch relocation (local-only).** Local preflight build failed on 7 root-level `.ts` + 46 `docs/tmp/*.ts` untracked scratch files (pre-existing from the `feature/data-integrity-skill` session). Moved all 53 into `scripts/worktree-scratch/` (tsconfig-excluded path) so local build matches CI behavior. None committed; all preserved on-disk for whoever needs them.

### Grep gate findings

**A1 — pipeline `staleDays` consumers:**

- `src/lib/slack/bot-proactive.ts:34` — filters `item.staleDays > 0` on `StaleAccountItem[]`. Previously dead (always 0 → always hidden). Post-change: stale notes now render when genuinely stale. Correct activation, no breakage.
- `src/lib/mcp/runway-tools.ts:88` — description references `staleDays` on project row (different code path — `getClientsWithProjects` returns raw schema, not this function's output).
- `src/app/runway/components/account-section.tsx:69` — reads `TriageItem.staleDays` (always undefined since `page.tsx` still maps `p.staleDays ?? undefined` and `projects.stale_days` is never written). Badge stays hidden.

No sentinel-0 consumers. Reported to TP before Commit 1.

**Δ3 — operations-reads-flags pill-shape consumers:**

- `operations-reads-flags.ts getFlags` — returns `{ flags, retainerRenewalDue: RetainerRenewalPill[], contractExpired: ContractExpiredPill[] }`.
- `bot-tools.ts:707`, `mcp/runway-tools.ts:310` — tool descriptions mention pill types.
- `bot-context-sections.ts:115-118` — system prompt references `flags.contractExpired` / `flags.retainerRenewalDue`.
- Tests: `bot-tools.test.ts`, `mcp/runway-server.test.ts`, `mcp/runway-tools.test.ts`, `operations-reads-flags.test.ts`, `operations-reads.test.ts`, `operations-reads-week.test.ts`, `bot-context-sections.test.ts`.

Decision documented above (parallel surfaces + shared Set import).

### Baseline drift (not caused by this PR)

- **TP-enumerated baseline:** `JobsDataTable.tsx`, `bot-tools.test.ts`, `proxy.test.ts`, `member-utils.test.ts`, `list-utils.test.ts`.
- **Actual upstream/runway baseline** (verified via `git stash` regression): also includes `account-section.test.tsx` (passes post-commit), `message-persistence.test.ts`, `filters.test.ts`, `operations-add.test.ts`, `operations-writes.test.ts`.
- `JobsDataTable.tsx` does not appear in current tsc errors (possibly resolved upstream before my branch cut — listed in TP's snapshot but not current).

### Gate results

- **Preflight pass 1:** build ✅ (after scratch relocation), tests 1909/1909 ✅, lint red on baseline only (my files clean).
- **Code-review:** 1 DRY violation found (`wrapperIds` vs `account-section.hasWrapper`) — fixed by exporting `accountHasWrapper` from unified-view. Steps 2-4: no prop drilling / Hooks issues / missing tests. All modified files have co-located test coverage.
- **Preflight pass 2:** build ✅, tests 1909/1909 ✅.
- **PR-ready:** 0 debug statements, 0 dead code, 3 deliberate `TODO(operator)` scaffolds per Phase E brief, 0 unused imports. Lint clean on all my touched files.
- **Atomic commits:** 3 logical commits landed (c5e6a01 / 84c9cb0 / c1b8164).

### Awaiting

- **Llama sweep (20-minute wait from PR open at ~19:35 → check at ~19:55+).**
- Operator merge (NOT me).

---

## Next work (reference for CC #2 + beyond)

Unchanged from the approved plan: CC #2 picks up retainer-wrapper write-path (rebase retainer commits + migrations + MCP surface expansion). My branch ships first so the Week-view `filterWrapperDayItems` guard is in place before CC #2's wrapper data lands. `get_retainer_team` is safe to ship ahead of wrapper rows — returns `{ error }` on invalid ids.

---

## Pre-plan history (archived)

The original pre-plan doc and round-1/round-2 TP reviews lived in this file before execution started. Superseded by the approved plan at `~/.claude/plans/wild-sauteeing-wigderson.md` and by this post-PR record. Preserved only as a pointer.
