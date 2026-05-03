# Data TP rehydrate — 2026-04-28 evening (post-trust-loss)

**Read this FIRST post-compaction.** This session ended with the operator withdrawing trust in the work shipped today. The next session's job is to AUDIT — not to ship more writes.

## Situation in one paragraph

Today, this TP shipped 4 cleanup batches (LPPC, AG1+S+B, HDL, Other Accounts) totaling 127 audit rows, all reported as "clean APPLY." Tonight the operator surfaced (via R1 TP investigation) that AG1's `Social Content Trial` retainer wrapper is sitting in prod with `startDate=null, endDate=null, contractStart=null, contractEnd=null` despite explicit notes saying work is underway. Bonterra's `Impact Report` project has `notes=null` despite being in-production. HDL has a fabricated vendor name (`Ken Clark` on Schema/SEO/AIO), a fabricated milestone date (`HDL Confirm to Launch 7/2` when schedule says 7/6), an invented task (`Open Page Decisions`), a mislabeled contractor (Chris labeled "client" when he's Civ contractor), a conflated work item (Civ R1 Refinements assigned to Lane when operator says it's Leslie's). Every range task across all 4 batches has its `date` pinned to `startDate` (causing UI red flags). The "clean APPLY" claim was about writes landing without crashing, not about data being right. **Operator stated: "The data integrity of these update batches are a joke."**

## Why QA missed this — and what to do differently

Today this TP dispatched 3 QA agents using yesterday's `feedback_qa_agent_for_prod_writes.md` pattern. Each QA agent read the spec + the migration script + helper sources and verified internal consistency. The QA passes returned "APPLY-clean / APPLY-after-fix" reports. The audit was circular: spec and code came from the same upstream (TP+drafter), and both were reviewed together, so flaws in either were invisible.

**The fix (codified in `feedback_data_qa_holdout_pattern.md`):** holdout QA panels run in parallel with code-review QA, but read prod state and operator intent INDEPENDENTLY of the spec. Five panels:

1. **Completeness** — every field on every entity touched: is it null when it shouldn't be?
2. **Consistency** — `date == endDate`, `dayOfWeek` matches actual date, `weekOf` matches date's week, range invariants
3. **Intent fidelity** — does prod reflect what operator said they wanted? Cross-check Slack/schedule sheets against prod. Cite source for every claim.
4. **Source attribution** — for every non-trivial value (vendor names, contractor labels, dates, scopes): trace to a source. Anything that traces to "drafter inferred" or "TP guess" gets flagged.
5. **Cascade integrity** — recompute landed correctly, parent dates derived from MIN/MAX of children, no reverse-cascade corruption, wrapper guards intact.

**These run BEFORE APPLY**, in parallel with code-review QA. Both pass = APPLY OK. Either fails = fix before APPLY.

## What this session was about to do (NOT YET DONE)

A corrective batch (`hdl-bonterra-corrective-2026-04-28`) was drafted, DRY_RUN green, ready to APPLY. **It was NOT applied** — operator withdrew trust before APPLY. Triplet on disk at:

- `scripts/runway-migrations/hdl-bonterra-corrective-2026-04-28.ts` (62 audit rows)
- `scripts/runway-migrations/hdl-bonterra-corrective-2026-04-28-verify.ts`
- `scripts/runway-migrations/hdl-bonterra-corrective-2026-04-28-REVERT.ts`

Plan markdown: `docs/tmp/data-integrity-audit/hdl-bonterra-corrective-plan-2026-04-28.md`

**Don't APPLY this until the audit completes.** The audit may surface additional gaps that should fold into a single comprehensive corrective rather than chaining batches.

## Operator's stated next steps (in this order)

1. **Compact** (about to happen).
2. **Audit** — read-only, no APPLY pressure. Cover all 4 batches landed today + cross-client sweep.
3. **Plan + DRY_RUN** for comprehensive corrective from audit findings.
4. **Slack Modal coordination with R1 TP** — root-cause solution to bot users adding tasks/projects without baseline field data.

## Audit scope (what the post-compact session must do)

### Per-batch intent audit

For each of the 4 batches landed today (LPPC, AG1+S+B, HDL, Other Accounts):
- Pull the spec markdown + the actual prod state post-APPLY
- Diff: which intended changes landed? Which fields the spec missed entirely?
- Specifically check: every entity touched, is every field populated where it should be?

Source files for each batch's spec:
- `docs/tmp/data-integrity-audit/lppc-phase3-plan-2026-04-27.md`
- `docs/tmp/data-integrity-audit/ag1-soundly-bonterra-plan-2026-04-27.md`
- `docs/tmp/data-integrity-audit/hdl-cleanup-plan-2026-04-27.md`
- `docs/tmp/data-integrity-audit/other-accounts-plan-2026-04-27.md`

Audit log query for each: `mcp__runway__find_updates` with `batchId=<batch_id>`.

### Cross-client completeness sweep (all 13 clients, 51 projects, 101 weekItems)

Run 5 holdout panels:

**Completeness:**
- Projects with `engagementType="retainer"` where startDate/endDate/contractStart/contractEnd is null
- Projects with `status="in-production"` where notes is null
- WeekItems with `endDate IS NULL` after we declared `date=endDate` convention
- WeekItems with `dayOfWeek IS NULL`
- WeekItems with `status IS NULL` (Slackbot create gap)

**Consistency:**
- WeekItems where `date != endDate` (post-convention)
- WeekItems where computed dayOfWeek of `date` doesn't match `dayOfWeek` field
- WeekItems where `weekOf` is not the Monday of the week containing `date`
- Range tasks where `startDate > endDate` (impossible)
- Milestones (no endDate) where `startDate != date`

**Source attribution (HDL-specific deep dive):**
- Schema/SEO/AIO `Vendor: Ken Clark` — operator confirmed Ken Clark IS in original SOW (Feb 2026), but unsure if work is done or pending. Strip until Jill confirms.
- HDL Confirm to Launch was set to 7/2 in this AM's batch; should be 7/6 per schedule sheet
- Open Page Decisions was created in this AM's batch with no source — confirm with Jill or DELETE
- Chris's role label: confirm "CW: Chris" (Civ contractor) not "CW: Chris (client)"
- Civ R1 Refinements assigned to Lane in this AM's batch; operator says Leslie

**Intent fidelity (cross-check operator's stated decisions):**
- HDL schedule sheet: Google Sheet `1G9GlBiLYimSelKas0rtq7MweVAhokW99AqWyC6tUDNo` Tab 1 (operator-shared today). Diff every HDL date against this.
- Bonterra Dev IR Revisions display anchor: operator wants `date=endDate=4/29`, currently `date=4/23`
- Date=endDate convention: operator codified this today. Every range task across ALL clients should be checked.

**Cascade integrity:**
- For every project touched today, verify `startDate = MIN(children.startDate ?? children.date)` and `endDate = MAX(children.endDate)`. Any drift = recompute didn't fire correctly or was overridden.
- AG1 Social Content Trial wrapper: `engagementType=retainer` triggers wrapper guard; verify guard is intact.

### AG1 root-cause investigation (specific deep-dive)

Operator + R1 TP flagged AG1 explicitly. Required:
1. Pull AG1+S+B spec from `docs/tmp/data-integrity-audit/ag1-soundly-bonterra-plan-2026-04-27.md`
2. Pull current AG1 prod state via `mcp__runway__get_client_detail("ag1")`
3. List every field the spec touched vs. every field the spec left null
4. Identify why dates were left null (spec gap vs. drafter miss vs. helper behavior)
5. Operator wants R1 TP's "option 2" performed: diff "what was supposed to land" against "what's actually in the DB"

## Worktree + state

- `.worktrees/data-tp-runway`, branch `feature/data-tp-cluster3` (from upstream/runway @ 66e9e36, PR 94)
- DB target: `libsql://runway-jasonburks.aws-us-east-1.turso.io` (Jason's Turso instance)
- 4 batches landed today: 127 audit rows under batchIds `lppc-phase3-kathy-confirmed-2026-04-27`, `ag1-soundly-bonterra-cleanup-2026-04-27`, `hdl-website-build-cleanup-2026-04-27`, `other-accounts-cleanup-2026-04-27`
- 1 corrective batch DRY_RUN green, NOT applied: `hdl-bonterra-corrective-2026-04-28`

## What NOT to do post-compact

- Don't APPLY the corrective batch yet
- Don't dispatch code-review-only QA (today's failure pattern)
- Don't trust drafter outputs without checking source attribution on every non-trivial value
- Don't skip the cross-client sweep just because the surface bugs are in HDL/AG1/Bonterra — the convention violation (`date=startDate` on ranges) likely exists across ALL clients

## Methodology rails (codified, do not skip)

- See `feedback_data_qa_holdout_pattern.md` for the 5-panel holdout pattern
- See `feedback_fresh_eyes_pass_before_apply.md` for cross-session migration review pattern
- See `feedback_qa_agent_for_prod_writes.md` for code-review pattern (run BOTH, not just one)
- See R1 TP's orchestration playbook (operator-shared 2026-04-28): TP plans, agents execute, holdout QA + multi-panel blind audit before any ship

## Memory cross-refs

- `project_data_tp_multi_wave_2026-04-27.md` — claimed all 4 batches APPLIED clean. Description needs updating to reflect the data-quality issues.
- `feedback_data_qa_holdout_pattern.md` — new memory written this session
- `feedback_qa_agent_for_prod_writes.md` — yesterday's pattern, valid for code review only

## Operator stance (verbatim from this session)

> "The data integrity of these update batches are a joke. that was not the direction it was given."
> "So basically I can't trust any of the work you did"

The post-compact session's tone should match: humble, verification-first, no claims without evidence. Audit before any new writes.
