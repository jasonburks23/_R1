# CC #2 Fire Message — DRAFT (HOLD until operator greenlights)

**Status:** Drafted 2026-04-24. DO NOT SEND until operator confirms:
- Cluster 2 APPLY landed clean in prod (Data-Integrity TP completes Scope A)
- No CC #2 boundary concern surfaced from Data-Integrity TP during their work
- Operator explicit greenlight to fire

**If Data-Integrity TP raises a CC #2 boundary concern** (e.g., "Task 2 orphan validator should be on my rails", or any scope shift), REVISE this message + re-patch the authoritative prompt before sending.

---

## The message to send (paste into CC #2's terminal)

PR 89 merged 2026-04-24. Cluster 2 (Convergix wrapper + 17 L1 nestings) has landed in prod via Data-Integrity TP's rails — 18 audit rows, wrapper-state-audit verification clean. You're clear to fire.

**Worktree:** You are in `.worktrees/runway-v3-cascade`. Stay here. Do NOT switch worktrees.

**Branch:** `feature/runway-retainer-v4-cleanup` — cut from post-PR-89-merge `main` via Task 1 (rebase).

**Authoritative prompt:** `docs/tmp/cc2-clean-prompt-2026-04-22.md` (amended 2026-04-24 for commit 11 — your starting prompt is CORRECT as-is, the amendment is woven in).

**Critical amendment context (2026-04-24):**
- `PROJECT_FIELDS` at `operations-utils.ts:323-333` ALREADY includes `engagementType`, `contractStart`, `contractEnd`, `parentProjectId`. Do NOT re-add.
- MCP `update_project_field` enum at `runway-tools.ts:422-430` ALREADY includes `parentProjectId`. Do NOT re-add.
- Your commit 11 REAL work: (a) add `engagementType`/`contractStart`/`contractEnd` to the MCP enum; (b) add Zod date validators with real ISO parse + roundtrip; (c) enforce `contractStart < contractEnd` invariant when both present; (d) ADD backend validators in `operations-writes-project.ts` for `parentProjectId` — parent exists, retainer parent, same `client_id`, 10-hop cycle walk. None of these backend validators exist today (zero grep hits).

**Parallel track awareness:** Wave 1 polish (`feature/runway-polish-phase1`) is firing in a separate worktree at the same time. You will NOT see their changes during your session. TP handles the rebase at the end. Your owned surfaces vs Wave 1's owned surfaces are already split in the prompt's "Do NOT touch" list — respect it.

**Do NOT open a PR.** When your work lands clean + preflight + code-review + pr-ready:
- Push your branch to origin
- Do NOT run `gh pr create`
- Do NOT run a 20-min Llama wait on your branch
- Report back to TP — TP handles the rebase + PR 90 open + Llama sweep

**Data-rails boundary (reinforced):**
- Task 2 orphan validator (`check-orphan-parent-project-ids.ts`): read-only diagnostic, in your scope. Data-Integrity TP may invoke it during Cluster 2 verification — that's a smoke test, not a conflict.
- Task 3 cherry-pick fe228da: git-history only (script already ran to prod, Data-Integrity TP already executed). Do not re-invoke.
- Tests: `test-db.ts` pattern mandatory. Zero prod Turso writes from test infrastructure. If an assertion genuinely needs prod contact, stop and flag to TP per-test.

**Enter plan mode.** Invoke `/plan`. Present your detailed implementation plan per the authoritative prompt. Exit via `ExitPlanMode` tool. TP reviews. Operator approves. Then build.

TP is watching. Grep verifies every technical claim in your plan (pattern from 2026-04-23 still active). Data-Integrity TP is also watching and may independently verify. Dual-TP review caught 2 flags on your CC #1 peer that TP alone missed — same discipline applies here.

Fire.

---

## If TP needs to revise this message

Common revision triggers:
- Data-Integrity TP raises boundary concern (orphan validator ownership shift, etc.) → update the "Data-rails boundary" section + patch the authoritative prompt
- Cluster 2 APPLY reveals unexpected prod state → update the "Cluster 2 has landed" opener to reflect actual state
- Operator wants to adjust commit 11 scope further → amend the "Critical amendment context" block + re-patch authoritative prompt
- Wave 1 branch has unexpected collision with CC #2 surfaces → update "Parallel track awareness" with specific collision details

Re-patch the authoritative prompt FIRST, then update this message to point at the patched prompt's relevant sections.
