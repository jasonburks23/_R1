# Data-Integrity TP Handoff — 2026-04-24

**From:** Primary TP
**To:** Data-integrity TP
**Session basis:** PR 89 merged 2026-04-24. Wave 1 polish + CC #2 retainer-v4 cleanup about to fire in parallel worktrees. PR 90 assembly + Wave 2 AsyncLocalStorage → PR 91 follow.
**Authority:** Per `feedback_no_migrations_by_cc.md` — all prod data writes, migration authoring, and realignment tooling belong to you. Primary TP's lane is code/tests/validators in CC sessions; data rails are yours.

## Three scopes in this handoff

- **(A) Cluster 2 execution + stakeholder ping** — Convergix wrapper creation + 17 L1 nestings. Safe any time post-PR-89-merge. Timing is your call.
- **(B) realignClientV4 helper design + retrofit decision** — holistic-review Refactor Opportunity #1. Consolidate the pattern the 8 cleanup scripts clone (L1→L1+L2 expansion + status flip + category normalize). Your design, your scope call.
- **(C) Data-write scope audit findings from Wave 1 + CC #2** — primary TP audited both prompts; zero data-write scope needed to be stripped. Documented below so you can verify.

---

## (A) Cluster 2 — Convergix wrapper + 17 L1 nestings

### Status
Plan on disk at `docs/tmp/data-integrity-audit/cluster-2-plan.md` (your working directory). All locked decisions operator-signed 2026-04-23.

### Locked wrapper metadata
- `name: "Convergix Retainer"` (no dates in name; new contract period = new wrapper row)
- `startDate: "2026-02-01"`, `endDate: "2026-07-31"` (explicit; supersedes "let recompute populate")
- `sort_order: 0`, `category: "active"`, `resources: NULL`, `status: "in-production"`, `owner: "Kathy"`
- 17 active L1 children nest; 3 historical completions stay unparented
- Batch: `convergix-wrapper-create-<YYYY-MM-DD>`, unique `updated_by`, 18 audit rows (1 wrapper create + 17 nestings)

### Timing (operator decision 2026-04-24)

**Cluster 2 fires FIRST** — before Wave 1 + CC #2. Operator's call: governance precedence + clean APPLY touchpoint + avoid 3-track attention fragmentation. Kick off as soon as you're ready.

Sequence:
1. You do Cluster 2 DRY_RUN + 2-pass QA + operator APPLY greenlight + APPLY + verify
2. You (optionally in parallel) start realignClientV4 (B) scope thinking — no time pressure since Wave 1/CC #2 are held
3. Primary TP fires Wave 1 + CC #2 in parallel AFTER your Cluster 2 APPLY lands clean
4. Primary TP rebases + opens PR 90
5. Llama → merge → Wave 2 AsyncLocalStorage → PR 91

Your Cluster 2 landing unblocks Wave 1 + CC #2 fire. Primary TP is watching and will proceed when you report APPLY-verified.

### Stakeholder ping (if needed)
Wrapper name "Convergix Retainer" is locked but Kathy has never seen the word "wrapper." If you want confirmation that the display name lands right in the UI, consider a one-line Slack: *"Creating a rollup row called 'Convergix Retainer' that parents the 17 active Convergix projects — surfaces in By Account view as the umbrella. Good with the name?"* Her pushback window is <12 hours typically. Optional — name is already locked.

### Acceptance criteria
1. DRY_RUN output shows 18 intended writes, zero unexpected deletions
2. Two independent fresh-context QA agents review the DRY_RUN + plan doc before APPLY (pattern per `feedback_qa_agent_for_prod_writes.md`)
3. Operator greenlights APPLY explicitly
4. POST-APPLY 8-assertion verification passes:
   - Wrapper project exists with locked metadata
   - 17 active L1s have `parent_project_id` = wrapper id
   - 3 historical L1s have `parent_project_id` = NULL
   - No orphaned children (cross-check with `pnpm runway:check-orphans` if CC #2's validator has shipped; else inline equivalent)
   - Audit count = 18
   - All audit rows share `batch_id` = `convergix-wrapper-create-<date>`
   - Wrapper's `startDate`/`endDate` match locked values (not recomputed from children)
   - `sort_order=0`, `category="active"`, `status="in-production"`, `resources=NULL`, `owner="Kathy"`
5. `pnpm runway:check-orphans` exits 0 if CC #2's validator has merged; otherwise your inline equivalent passes

### Related memories
- `feedback_no_migrations_by_cc` — your rails
- `feedback_qa_agent_for_prod_writes` — 2-pass QA agent pattern
- `feedback_mcp_batch_hygiene` — batch_id + updated_by discipline
- `feedback_dryrun_vs_apply_gap` — DRY_RUN skips helper validators
- `feedback_revert_idempotency_poisoning` — bump updated_by on retry
- `feedback_skip_slack_publish_cleanup` — no Slack publish for cleanup batches

### Related artifacts in your working dir
- `cluster-2-plan.md` — existing plan
- `wrapper-state-audit.md` — pre-state
- `convergix-reconciliation.md` — data cross-check
- `q5-remaining-report.md` — final state summary

---

## (B) realignClientV4 helper design + retrofit decision

### Context (holistic-review Refactor Opportunity #1)
The holistic review identified a pattern cloned across 8 cleanup scripts that already ran to prod:
- `bonterra-v4-touchup-2026-04-21.ts` (+ REVERT)
- `convergix-v4-realign-2026-04-21.ts` (+ REVERT)
- `hdl-v4-realign-2026-04-21.ts` (+ REVERT)
- `lppc-v4-realign-2026-04-21.ts` (+ REVERT)
- `tap-*` (per review)
- `asprey-v4-touchup-2026-04-21.ts` (+ REVERT)
- `soundly-v4-realign-2026-04-21.ts` (+ REVERT)
- `dave-asprey-cleanup-2026-04-21.ts` (+ part2)

Each script repeats: L1 → L1+L2 expansion + status flip + category normalize + batch tagging + audit rows. Each script also clones the `PROJECT_FIELDS` whitelist bypass (see review Finding #4) — routing around the whitelist via raw `ctx.db.update(projects).set()` + manual `insertAuditRecord()`.

**Important context (primary TP verification 2026-04-24):** The whitelist extension part is ALREADY DONE. `PROJECT_FIELDS` at `operations-utils.ts:323-333` already contains `engagementType`, `contractStart`, `contractEnd`, `parentProjectId` (landed in PR 88). Existing scripts bypass anyway for historical reasons; new scripts don't need to.

### Your scope (your call on shape)

Design choice 1 — **scope of the helper:**
- (a) Forward-looking only — ship a `realignClientV4(clientSlug, plan)` helper for FUTURE clients; leave the 8 existing scripts alone as historical record
- (b) Forward-looking + retrofit — same helper, plus rewrite the 8 existing scripts to use it (scripts stay in git as audit trail; behavior must be identical)
- (c) Skip — acknowledge the pattern, document the policy, don't consolidate

Primary TP's lean: **(a) or (b).** (c) leaves future client cleanups (Ronan, Allison follow-ups, etc.) cloning the same pattern.

Design choice 2 — **helper interface:**
- `realignClientV4(clientSlug: string, plan: ClientRealignPlan): Promise<RealignResult>`
- `ClientRealignPlan` captures: `l1Splits` (which L1s to split into L1+L2), `statusFlips` (array of `{ projectId, fromStatus, toStatus }`), `categoryNormalizations`, `parentAssignments` (for wrapper cases)
- Executed via `runway-migrate.ts` runner for DRY_RUN/APPLY safety
- Uses `updateProjectField()` and `createProject()` helpers where possible (now that `PROJECT_FIELDS` has the retainer fields); falls back to raw write only where legitimately needed (schema-level fields not in the whitelist)

Design choice 3 — **retrofit methodology (if you pick b):**
- Rewrite one script at a time against a known-good prod snapshot
- Run DRY_RUN and diff against the original script's historical audit trail (`select * from updates where batch_id = '<original-batch>'`)
- Helper output must produce identical audit rows (modulo timestamp/updated_by)
- Tests verify the helper against test-db with the same plan → same row count + content

### Acceptance criteria
1. Helper lives at `src/lib/runway/realign-client.ts` (new file) with explicit types
2. Tests cover: L1→L1+L2 split, status flip, category normalize, parent assign, combined plan
3. If retrofit scope (b): each of the 8 scripts rewritten. Audit-trail diff shows identical writes (timestamps/updated_by free). Original scripts either deleted or preserved in `scripts/runway-migrations/archive/`.
4. README update at `scripts/runway-migrations/README.md` — "authoring a client realign" section documenting the helper
5. No prod writes during development — test-db only
6. Deploy path: if (b), the rewrites land as a `feature/runway-realign-helper` PR, separately from PR 90/91. If (a), still its own PR.

### Caveats
- The helper is itself a write-path abstraction. You're authoring new migration tooling. This is within your rails per `feedback_no_migrations_by_cc.md`.
- DO NOT run any of the existing 8 scripts against prod as part of the retrofit — they already ran. Only new clients use the helper going forward.
- If retrofit touches `scripts/runway-migrations/hotsheet-cleanup-2026-04-22.ts` — stop, that's Track 3 cleanup, scope is different, not a v4 realign.

### Related memories
- `feedback_migration_field_whitelist` — grep migration `field:` strings against PROJECT_FIELDS/WEEK_ITEM_FIELDS
- `feedback_dryrun_vs_apply_gap` — DRY_RUN skips helper guards
- `feedback_tp_orchestration_for_migrations` — TP orchestrates subagents directly

---

## (C) Data-write scope audit from Wave 1 + CC #2 (none found)

### Wave 1 (`feature/runway-polish-phase1`) audit
- Files touched: `src/lib/slack/bot.ts` (MODEL constant), `src/app/runway/runway-board.tsx` (memo fix), `src/app/runway/queries.ts` (READ path optimization + date filter), `src/app/runway/components/*.tsx` (UI polish), `docs/runway.md`, `docs/mcp-runway-tools.md`
- Write-path files in explicit DO NOT TOUCH list: `operations-writes-project.ts`, `operations-writes-retainer.ts`, `operations-utils.ts`, `runway-tools.ts`, `bot-tools.ts`, `operations-reads-retainers.ts`
- Zero migration scripts, zero Turso writes, zero `pnpm runway:push` or `runway:migrate` invocations

**Verdict: clean.** Wave 1 is pure code/tests/UI polish. Nothing to strip for you.

### CC #2 (`feature/runway-retainer-v4-cleanup`) audit
- Task 2 (orphan validator, `check-orphan-parent-project-ids.ts`): **read-only diagnostic.** Script queries prod for orphaned `parentProjectId` values; returns non-zero exit if found. Operator invokes manually post-merge as smoke test. No writes.
- Task 3 (cherry-pick `fe228da`, `hotsheet-cleanup-2026-04-22.ts`): **historical git record only.** Script already ran against prod in Track 3 cleanup (per `project_convergix_cleanup_applied.md`). Cherry-pick brings it into the branch's git history — does NOT re-apply to prod.
- Task 4 (recompute guard in `operations-writes-retainer.ts`): **code change**, modifies the helper. CC #2 writes code; the helper executes future writes at callsite time. Not a data-write operation itself.
- Task 5 (MCP tools: `override_project_date`, `set_project_parent`, `batch_apply`, enum expansions): **adds write-path tooling.** Same framing — code that future callers use. Tests via `test-db.ts` pattern (mandatory per prompt), zero prod contact.
- Task 6 (schema-drift gate): **read-only** diff check to verify `runway-schema.ts` matches prod shape.

**Verdict: clean.** CC #2 is code/tests/validators. Nothing to strip.

### Caveats for you
- The orphan validator (Task 2) lives in `scripts/runway-migrations/` because that's where related tooling clusters. It's read-only. You may want to invoke it post-PR-90-merge as part of your Cluster 2 verification.
- CC #2's commit 11 amendment (primary TP's 2026-04-24 patch) ensures CC #2 adds `engagementType`/`contractStart`/`contractEnd` to the MCP enum + backend validators for `parentProjectId`. If you've been depending on bypassing PROJECT_FIELDS in your migration scripts for these fields, note that CC #2 is NOT removing the PROJECT_FIELDS entries (they were added PR 88) — future scripts can call `updateProjectField()` directly.

---

## Boundaries / do NOT

- **Do NOT open PR 90** — primary TP owns the rebase + PR open mechanics post-Wave-1 + CC #2 completion
- **Do NOT fire new CC sessions** — your lane is data rails; CC sessions are primary TP's orchestration
- **Do NOT run migrations against prod without operator greenlight** — standard rail, restating because it's always true
- **Do NOT touch Wave 1 or CC #2 branches** — those are in flight in their worktrees
- **Do NOT skip the 2-pass QA agent pattern** for Cluster 2 APPLY — that pattern caught 7+ real issues on Convergix cleanup (per `feedback_qa_agent_for_prod_writes.md`)

## On re-engagement (post-compaction for you)

Read order:
1. `~/.claude/projects/-Users-jasonburks-Documents--AI---R1/memory/MEMORY.md` — index (user-level memory you may or may not have access to; if not, read your own memory)
2. This handoff (`docs/tmp/data-integrity-handoff-2026-04-24.md`)
3. `docs/tmp/data-integrity-audit/cluster-2-plan.md` — your Cluster 2 plan
4. `docs/tmp/data-integrity-audit/wrapper-state-audit.md` — pre-state
5. Primary TP's `docs/brain/tp-handoff-2026-04-24-multitrack.md` for the broader cycle state

First question to operator on re-engage:
> "For data rails: ready to fire Cluster 2? Do you want me to draft the realignClientV4 helper in parallel to Wave 1/CC #2, or sequence it after PR 90 merges?"

## Report back to primary TP

When you pick a Cluster 2 timing window, let primary TP know so the PR 90 assembly can coordinate. For (B) realignClientV4 — primary TP doesn't need to track the helper's progress unless it affects PR 90 timing (which it shouldn't, since it's a separate branch).
