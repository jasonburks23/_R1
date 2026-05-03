# Post-compaction handoff prompt (refresh 2026-04-23 post-CC1-review)

Paste this as the first message to a freshly-compacted me to rehydrate without re-running discovery.

**Expected state when you wake up:** CC #1 has shipped and merged. You are rehydrating to execute Cluster 2 (Convergix wrapper create + 17 L1 nestings).

---

I'm your data-integrity thought-partner session continuing after compaction. Rehydrate in this order:

**1. Verify CC #1 actually merged (immediate check):**
```bash
git fetch upstream runway 2>&1 | tail -5
# Look at upstream/runway HEAD; was 219819c pre-CC-1. If advanced, CC #1 likely merged.
git log --oneline upstream/runway..HEAD 2>&1 | head -5   # from worktree root
```

Check `feature/runway-flags-consolidation` branch status on GitHub (gh pr list --state merged) to confirm merge. If not merged yet, adjust plan — Cluster 2 is gated on merge. Do NOT execute Cluster 2 until merge confirmed.

**2. Read docs/tmp/data-integrity-audit/ in this order:**
- `wrapper-state-audit.md` — fresh prod snapshot 2026-04-23T15:19 UTC + locked metadata table. Canonical 17-active-Convergix-L1 roster with IDs. Use this as the source-of-truth for what Cluster 2 writes.
- `cluster-2-plan.md` — Cluster 2 authoring prep (batch_id naming, field whitelist, 17 L1 IDs, post-verify queries). Read this second — it's your execution blueprint.
- `cc1-review.md` — my CC #1 plan review.
- `cc2-review.md` — my CC #2 plan review.
- `tp-cc-review-response-2026-04-23.md` — handoff to primary TP.
- `pending-decisions.md` — adjustment log. Last entry is the 2026-04-23 post-compact CC plan-review session.

**3. Read primary-TP-side artifacts (for cross-walk):**
- `docs/tmp/cc2-clean-prompt-2026-04-22.md` — authoritative CC #2 prompt, **APPROVED by me**.
- `docs/tmp/cc2-data-writes-inventory-2026-04-22.md` — data-writes inventory, **APPROVED by me**.
- `docs/tmp/cc1-round-2-feedback-2026-04-23.md` — round-2 feedback that was relayed to CC #1.

**4. Read auto-memory:**
- `~/.claude/projects/-Users-jasonburks-Documents--AI---R1/memory/MEMORY.md` index.
- `project_convergix_cleanup_applied.md` — wrapper metadata UPDATED 2026-04-23 (explicit startDate/endDate, sort_order=0, terminology fixed).
- `feedback_qa_agent_for_prod_writes.md` — 2-pass QA pattern.
- `feedback_no_migrations_by_cc.md` — all data writes through me.
- `feedback_stakeholder_question_pattern.md` — question-drafting pattern (Phase 3).

**5. /data-integrity skill** at `.claude/skills/data-integrity/` — batch-hygiene rails, terminology, write-batch template. Use the skill for Cluster 2's tsx authoring — don't re-derive.

---

## Rails reminder

- No prod writes without explicit per-op operator approval.
- Scratch scripts only in `docs/tmp/data-integrity-audit/`.
- Env var names only, never values.
- Stakeholder terminology: Project = L1, Task/Phase = L2, **Wrapper sits ABOVE L1** (not at L1, that earlier framing was wrong). No internal DB jargon (parent_project_id) in anything staff-facing.
- Batch-hygiene: unique batch_id + unique updated_by per run (bump `-runN` on retry after revert), drizzle typed inserts, never direct-write `projects.startDate/endDate` EXCEPT via new `override_project_date` MCP tool with `bypassGuard=true` (shipped by CC #2), field whitelist grep, 2-pass fresh-context QA agents before APPLY.
- Re-pull prod (`pnpm runway:pull` from `.worktrees/pr88-v4-hardening`) before EVERY data-write batch.

---

## Current state (at compaction point)

**Applied to prod (don't re-apply):**
- Convergix Kathy-cleanup 2026-04-22 (101 audit rows). Projects 16→20, week_items 30→33, NULL-status Convergix L2s 7→0.
- Timestamp correction 2026-04-22 (38 ms-encoded `updates.created_at` rows fixed in place).

**Decisions locked 2026-04-23:**
- Wrapper metadata complete (see `project_convergix_cleanup_applied.md` auto-memory for canonical table).
- Wrapper startDate/endDate explicit at creation (2026-02-01 / 2026-07-31), sort_order=0.
- Nest 17 active L1s, exclude 3 historical completions.
- Retainer-renewal Task on wrapper dated 2026-05-25 (Cluster 3, post-CC-#2).

**CC #1 review status (at compaction point):**
- CC #1 returned revised plan round-2 with round-1 + round-2 feedback incorporated.
- Data-integrity TP flagged 2 issues before ExitPlanMode greenlight:
  - **Flag 1:** 4A wrapper-as-umbrella render claim — CC #1 asserted existing ProjectCard.children pattern handles it. Needs verification (grep account-section.tsx:108-141 for parentProjectId-based L1 nesting). If existing logic only nests weekItems under L1, CC #1 must add L1-under-L1 nesting.
  - **Flag 2:** 4C return shape regression — CC #1 simplified to `{ wrapperName, childCount, team: string[] }`; spec requires full `RetainerTeamResult` with `team: RetainerTeamMember[]` (name + roles + childProjectIds), wrapperId, clientName, owner separate from team.
- Operator relayed flags to CC #1. CC #1 addressed, re-ExitPlanMode'd, operator greenlit, CC #1 executed.

**TP deliverables all APPROVED (pre-compaction):**
- `cc1-round-2-feedback-2026-04-23.md` — relayed to CC #1.
- `cc2-clean-prompt-2026-04-22.md` — 13 commits, all 6 tightening asks landed.
- `cc2-data-writes-inventory-2026-04-22.md` — refreshed, Cluster 2 / Cluster 3 split documented.

---

## What to do immediately post-rehydration

**Step A — Verify CC #1 merge + pull fresh prod.**

```bash
# In .worktrees/pr88-v4-hardening (worktree with runway scripts):
pnpm runway:pull
```

Read the fresh snapshot at `data/runway-snapshot.json`. Cross-check:
1. No rows in `projects` have `parent_project_id` set yet (Cluster 2 hasn't run).
2. The 17 active Convergix L1 IDs in `wrapper-state-audit.md` still match prod (no surprise deletes/renames since 2026-04-23 15:19 UTC).
3. No new `batch_id` in audit log referencing wrapper or nesting.

If any drift → investigate before executing. If clean → proceed.

**Step B — Author Cluster 2 tsx script.**

Read `cluster-2-plan.md` for the full blueprint. Use `/data-integrity` skill's `template-write-batch.ts` as the starting structure.

Required:
- New file: `docs/tmp/data-integrity-audit/convergix-wrapper-create.ts`
- Uses drizzle typed inserts (NOT raw SQL).
- batch_id = `convergix-wrapper-create-<YYYY-MM-DD>` (use actual date at execution time).
- updated_by = `convergix-wrapper-create-<YYYY-MM-DD>`.
- DRY_RUN mode default. Require APPLY=true env var to actually write.

**Step C — DRY_RUN + QA cycle.**

1. Run DRY_RUN. Capture output to `convergix-wrapper-create-dryrun.txt`.
2. Spawn Pass-1 fresh-context QA agent per `feedback_qa_agent_for_prod_writes`. Give full context (plan doc, wrapper-state-audit, DRY_RUN output, /data-integrity skill).
3. If Pass-1 finds issues → fix → re-DRY_RUN → Pass-2 QA.
4. If Pass-1 clean → can proceed with single-pass if deterministic + independent post-verify runs, OR still do Pass-2 for safety on a structural write like wrapper create.

**Step D — Get operator approval to APPLY.**

Present QA clean + DRY_RUN diff summary. Wait for explicit per-op greenlight.

**Step E — APPLY + post-verify.**

1. Execute with APPLY=true.
2. Run post-verify script that checks:
   - Wrapper exists with exact locked metadata.
   - Exactly 17 children have `parent_project_id = wrapper.id`.
   - 3 historical completions still have `parent_project_id = NULL`.
   - 18 new audit rows under the batch_id.
   - No ms-encoded timestamps.
3. Run `pnpm runway:check-orphans` (shipped by CC #2, should be in scripts/runway-migrations/).
4. Capture output to `convergix-wrapper-create-verify.txt`.

**Step F — Update docs.**

- `pending-decisions.md` adjustment log entry (new row).
- `project_convergix_cleanup_applied.md` auto-memory: move Cluster 2 from "pending" to "applied."
- `data-shape.md` row counts + last refresh timestamp.
- `handoff.md` — refresh for Cluster 3 (pending CC #2 merge) as the next scenario.

---

## Hold-line (don't do yet)

- **Cluster 3 (retainer-renewal Task on wrapper)** — gated on CC #2 merge. Do NOT execute until CC #2's recompute guard is live in prod. Without it, the Task write would collapse wrapper dates. If operator asks, redirect to Cluster 3 blueprint already drafted.
- **Phase 3 (17 non-Convergix NULL-status L2s)** — gated on Kathy-team replies to Phase 3 question doc. Operator will refine doc with me first, then Kathy receives, then replies drive per-row decisions.

---

## If CC #1 didn't merge yet

If Step A shows CC #1 still in flight:
- Don't execute Cluster 2.
- Re-read `cc1-review.md` flags — check if they were resolved.
- Re-read operator's most recent direction (check `pending-decisions.md` for the latest log entry).
- Ask operator for CC #1 status and what to do next (Llama sweep? blocked? re-review?).

Do not re-run discovery. Do not re-pull the full snapshot unless about to act on specific numbers. Do not re-apply any shipped batch. Trust the doc set above as current truth at compaction point.
