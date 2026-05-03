# TP Alignment Prompt — Post-CC Planning, Pre-Execution

Paste this verbatim to TP after CC compacts. TP reads the plans, pushes back, then orchestrates execution.

---

```
Alignment sync. CC compacted. All planning artifacts live in
/Users/jasonburks/Documents/_AI_/_R1/.worktrees/runway-v3-cascade/docs/tmp/.

## Read these in order

1. `pr89-plan-2026-04-21.md` — PR 89 (write-path + migrations + scripts). Branch feature/runway-retainer-v4-cleanup (existing, 7 unpushed commits that need rebase). Contains the CC prompt to paste verbatim to CC #A.

2. `pr90-plan-2026-04-21.md` — PR 90 (read-path + UI + flags). Branch feature/runway-flags-consolidation (new, branches off upstream/runway). Contains the CC prompt to paste verbatim to CC #B. Runs PARALLEL to PR 89.

3. `pr91-plan-2026-04-21.md` — PR 91 (generalized empty-string → null coercion). Small, focused, SEQUENTIAL after PR 89 merges. Single CC later.

4. `operator-questions-pre-tp-2026-04-21.md` — blocking + non-blocking operator questions, grouped by PR. Q89.1 is resolved (moved to PR 91). Most non-blocking questions ship as TODO markers in scaffolds; operator answers during PR review or post-merge.

5. `operator-mcp-fixes-2026-04-21.md` — 4 P1 data fixes from tonight's audit. NOT a PR — MCP calls operator runs directly. YOUR parallel workstream with operator while CC #A and CC #B work PR 89 and PR 90.

6. `flag-investigation-prompt-2026-04-21.md` — resolved diagnosis record. Findings already rolled into PR 89 (none, actually) and PR 90 (orphan stale_days fix, exclude-blocked change). Reference only, no active role.

## What CC settled before compact

- 7 retainer-v4-cleanup commits applied to prod tonight (all 35 ops verified live)
- PR 88 schema reconciled in prod via raw SQL (target dropped, parent_project_id added)
- Llama findings from PRs 86/87/88 triaged: #1 false positive, #2 in PR 89, #3 resolved by PR 89 deletion, #4 in PR 90, #5 in PR 91
- TP audit P0 (schema drift) confirmed FALSE ALARM — prod matches upstream/runway schema
- TP audit P1 (4 data fixes) → your workstream with operator
- TP audit P2 convention (retainer recompute) → PR 89 Task 5
- Board QA: In Flight 4 ✓, Today 2 ✓, data integrity clean ✓

## Operator-confirmed decisions from CC's session

- Q89.1 RESOLVED: pull coercion refactor out of PR 89, make it PR 91 sequential.
- Q89.3b: ship scaffold with TODO(operator), discuss during PR review.
- Q90.1: default — hierarchy-demotion surfaces as new flag category in right-rail FlagsPanel.
- Q90.2: GO on excluding blocked status from resource-conflict count (Kathy 33 → ~11).
- Q89.2a: default qualifying filter accepted for scheduled-status backfill scaffold.

Non-blocking remaining questions are still in operator-questions-pre-tp file. CC didn't push for answers on those — they ship as scaffold TODOs or ship with status-quo behavior.

## Your job now

### Step 1 — Pushback pass (no code)

Read all 5 plan files + operator-questions file. Push back on:
1. Split integrity — is the write-path/read-path file line really clean between PR 89 and PR 90, or did CC miss a shared surface?
2. Default proposals — anything wrong, unsafe, or mismatched to operator intent?
3. Blocking vs non-blocking classification — did CC misclassify?
4. Task sizing — PR 89 has 8 tasks + 11 commits. Too big?
5. Missing questions — what should operator have been asked that CC didn't?
6. Conflict A resolution on PR 89 — does the described rebase merge actually work?
7. Parallelism — is the zero-overlap guarantee really true?

Report: diagnosis + recommendations. No code changes. Show operator so they can resolve before CC execution.

### Step 2 — Operator-MCP-fixes workstream (your parallel work)

While CC #A + CC #B execute PR 89 and PR 90 in parallel, you work the 4 P1 fixes in operator-mcp-fixes-2026-04-21.md:
1. Convergix / Fanuc Award L1 → awaiting-client
2. LPPC / Website Blog Posts L1 → awaiting-client
3. LPPC / MyLPPC Training Video — investigate block source FIRST, then L1 status
4. Soundly / AARP Member Login — intake conversation with Allison/Jill, do not MCP until scope agreed

Run these via MCP as operator approves each. Don't queue all at once — sequential with operator sanity-check per item.

### Step 3 — Execute PR 89 + PR 90 in parallel

After pushback is resolved (operator signs off on your diagnosis):

- Fire CC #A with the PR 89 CC prompt (verbatim from pr89-plan file)
- Fire CC #B with the PR 90 CC prompt (verbatim from pr90-plan file)
- Each CC runs independently, reports back with commit hashes + gates

Both branches push + open PRs independently. Either can merge first. Operator reviews both.

### Step 4 — Post-merge: PR 91

After PR 89 merges, fire a CC with the PR 91 plan (single CC, small scope). PR 91 is the coercion generalization refactor.

## Ground rules for you

- Don't let CC #A and CC #B touch each other's file surfaces. Owned lists are in each plan file.
- Don't let any CC apply migrations — the 2 scaffolds in PR 89's Commit 10 are TODO-marked for post-merge operator apply.
- Don't skip the pushback pass. Diagnosis before execution.
- Update operator-questions file as answers come in during review so post-compact CC (me) has the running record.
- Surface any question you don't know how to answer — don't guess.

## When to check back with CC

- After pushback pass, before giving CC prompts to CC #A/B.
- When either CC reports gate failures or surfaces a surprise.
- When operator resolves a non-blocking question during review.
- Before merging either PR.

CC will re-engage post-compact once you've done the pushback pass
and either have a clean bill or concrete concerns to resolve.
```
