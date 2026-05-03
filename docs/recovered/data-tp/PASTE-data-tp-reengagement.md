# SUPERSEDED — DO NOT PASTE

> **2026-05-01 ~19:00:** This prompt is superseded by `PASTE-data-tp-correction.md`. The corrected version reflects: the rename to canonical `_R1/` is complete, the worktree pointer repair is done, and the role split (data-tp's own QA wave vs. evaluator's intent-fidelity gate before APPLY) is fixed.
>
> Original draft preserved below for audit trail only. References to `_R1_RECOVERED/...` should be read as `_R1/...`.

---

# Original (superseded) Data TP re-engagement prompt — paste-ready

Paste the block between the markers into the fresh data-tp Claude Code session AFTER completing the worktree setup steps in `PRE-PASTE-worktree-setup.md`.

---

## ===== PASTE TO DATA TP =====

```
/data-integrity-tp

CRITICAL CONTEXT — READ BEFORE ANY PROD WRITES:

On 2026-05-01 ~08:38 AM CDT, the operator's `/Users/jasonburks/Documents/_AI_/_R1/` directory was wiped by an unknown event (NOT a Claude Code agent — verified across 187 session JSONLs). All worktrees, source code, brain docs, and `.env.local` were lost locally. Recovery has been performed.

**IMPORTANT — paths have changed:**
- Old (WIPED, do not use): `/Users/jasonburks/Documents/_AI_/_R1/...`
- New main repo: `/Users/jasonburks/Documents/_AI_/_R1_RECOVERED/`
- Your worktree (your cwd should already be here): `/Users/jasonburks/Documents/_AI_/_R1_RECOVERED/.worktrees/data-tp-runway/`
- Branch: `feature/data-tp-cluster3` off `upstream/runway` (matches your pre-wipe branch name)
- If your skill files or memory reference `_R1/...` paths, mentally translate to `_R1_RECOVERED/...` for now. Operator will canonicalize the rename later.

What survived (already on disk, ready for you):
- Your skill files at `~/.claude/skills/data-integrity-tp/` (escaped wipe — this directory was outside `_R1/`). Latest mtimes confirm post-Soundly close patches landed:
  - `data-conventions.md` (Apr 30 23:38)
  - `row-by-row.md` (Apr 30 20:35)
  - `SKILL.md`, `drafter-prompt.md`, `holdout-panels.md`, `rails-reference.md`
- Memory files at `~/.claude/projects/-Users-jasonburks-Documents--AI---R1/memory/` including `project_data_loss_2026-05-01.md` (full triage), `project_data_tp_clients_closed_2026-04-29.md`, `project_data_tp_queue.md`, etc. Auto-loaded.

Recovered files (paths are absolute so you don't have to guess; also given as relative-to-your-worktree-cwd in parentheses):

In MAIN REPO (`_R1_RECOVERED/`, NOT your worktree):
- `_R1_RECOVERED/docs/tmp/data/data-tp-handoff-2026-04-30.md` (30KB, relative: `../../docs/tmp/data/data-tp-handoff-2026-04-30.md`) — your own cross-session handoff. LPPC + cohort framework + 5 sweep categories + Hot Sheet pattern + on-re-engagement steps 1-11
- `_R1_RECOVERED/docs/tmp/hdl-cleanup-handoff-2026-04-28.md` and `hdl-prod-snapshot-2026-04-28.json` (HDL closure reference)
- `_R1_RECOVERED/docs/tmp/data/lppc-snapshot.json` (LPPC closure snapshot reference)

In YOUR WORKTREE (`_R1_RECOVERED/.worktrees/data-tp-runway/`):
- `docs/tmp/data/convergix-spec-2026-05-01.md` (16KB) — TP-approved Round 1 Convergix spec; the spec the drafter agent worked from
- `docs/tmp/data-integrity-audit/` — 6 audit plan docs (multi-wave-plan, audit-report-2026-04-28, ag1-soundly-bonterra-plan, hdl-bonterra-corrective-plan, lppc-phase3-plan, other-accounts-plan) — all 2026-04-27/28
- `docs/brain/data-tp-rehydrate-2026-04-27.md` and `data-tp-rehydrate-2026-04-28-post-trust-loss.md`
- `docs/tmp/runway-slack-modal-spec.md`, `slack-modal-add-flow-handoff.md`, `hdl-gantt.html`, `hdl-gantt-proposed-2026-04-28.html`
- `scripts/runway-migrations/convergix-retainer-renewal-task-2026-04-26.ts` + `-REVERT-2026-04-26.ts` + `-verify-2026-04-26.ts` (4/26 retainer renewal precedent triplet — closest similar batch shape to what you'll re-draft for cards)
- `scripts/runway-migrations/hopdoddy-cards-1-2-2026-04-30-verify.ts` (Hopdoddy verify, closed work for reference only)
- Note: pre-existing Convergix migrations from upstream (`convergix-cleanup-2026-04-20.ts`, `convergix-v4-realign-2026-04-21.ts/-REVERT.ts`) are also present — those are merged work, not your in-flight stuff.

In STAGING (recovery-only; not directly in your worktree, reference if helpful):
- `_R1_RECOVERED/docs/recovered/runway-v3-cascade/docs/tmp/data-integrity-audit/` — historical Convergix audit work from 2026-04-24-28 done in the runway-v3-cascade worktree (R1 TP's work, not yours; useful for cross-reference): convergix-batch.ts (54KB wrapper-create work), batch-plan, full-state, kathy-replies, null-status-review, post-verify, reconciliation, task-meta-check
- `_R1_RECOVERED/docs/recovered/data-tp/data-tp-paste-extraction-2026-05-01.md` — R1 TP's own notes from extracting your scrollback (has Round 2 fix list + locked decisions + your state-at-wipe-moment in detail; READ THIS if anything in this prompt is unclear)

What was NOT recovered:
- `convergix-cards-2026-05-01.{ts,verify.ts,REVERT.ts}` — your Round 1 triplet code. Drafted by a worktree-isolated subagent; transcript not on any disk we scanned. **NOT BLOCKING:** the spec doc IS on disk, and the spec → triplet path is reproducible. Net loss = ~17 min of drafter agent runtime.
- Soundly snapshot file (closed work, not blocking).

YOUR STATE AT WIPE-MOMENT (Round 1 QA was complete, Round 2 patch dispatch was the next move):

batchId: convergix-cards-2026-05-01
updatedBy: data-tp-2026-05-01
(Both PRESERVED into Round 2 — no APPLY happened, no rotation needed.)

THE 4 ROUND 2 PATCH FIXES YOU IDENTIFIED PRE-WIPE:

1. CRIT (Code-QA): D2 dayOfWeek="thursday" wrong — 5/8 is Friday. Fix D2_DOW → "friday" (forward + verify + spec).
2. CRIT (Code-QA): D3 dayOfWeek="thursday" wrong — 5/8 is Friday. Fix D3_DOW → "friday".
3. CRIT (Panel 5 + your TP catch): A14 dueDate cascade guard mismatch. Industrial/Battery has existing deadline child 8f9cacca (date=7/31). Cascade fires same-value (data-safe), but drafter's "expect 0" guard FAILs APPLY. Adjust A14 guard to expect 1 cascade item.
4. CRIT (your TP catch): A10 dueDate=null would corrupt L2 66414d4d "May Content Calendar Draft" (cascade clears its date). Recipe: flip 66414d4d category deadline→delivery (skill-correct anyway — calendar draft is a delivery, not external deadline) BEFORE A10.dueDate=null write.

Updated audit count target: 102 → ~104 (+1 cat flip + 1 cascade-duedate audit on A14).

LOCKED DECISIONS (Q1-Q4 + new context A/B/C — operator confirmed pre-wipe):

Q1 — 5 orphan L2 chain: parent ALL 5 to AUTOMATE Booth Elements (272e7eef). Confirmed via Convergix project tracker sheet. Snap "Deliver files" L2 from 5/17 → 5/15 to match sheet. b85f246 also → AUTOMATE Booth.
Q1 side-effect: keep "printer-due 5/18" milestone under #2; DROP "booth schedule build placeholder" (now-parented chain covers active build work).

Q2 — Rockwell Co-Marketing Nicole conv: option B (default). L2 746b03b4 → status=completed, L1 stays awaiting-client. (Fallback: A if scope-landed signal; C if slipped.)

Q3 — Social Content monthly model: option A (keep 4 separate L1s — April/May/June/July). SOW confirms "12 pieces of content/month."

Q4 — Retainer renewal L2 (1859637a "2H Convergix Retainer Renewal"): date=2026-05-25, dayOfWeek=monday, category=kickoff, status=scheduled, owner=Kathy, resources="AM: Kathy, PM: Jason".

A — Convergix Retainer SOW (effective 2026-01-26):
- Update wrapper 4171aa4d: contractStart=2026-02-01, contractEnd=2026-07-31, contractValue=$100,000
- Update client.contractValue=$100,000 (per skill v3 retainer ARR convention)
- SOW EXCLUDES "Tradeshow design and booth production or fabrication" → AUTOMATE Booth (272e7eef) is OUTSIDE retainer. If currently parent=wrapper, re-parent to standalone (parent=null + engagementType=project). If already standalone, leave.
- For all OTHER L1s: don't re-parent based on SOW scope inference. Surface anomalies in sweep.

B — CDS Vertical (#11 / 0e4214c6): keep dueDate=5/14 (already pre-decided). Add notes: "Case study + brochure scope TBD per 4/7 deck; extend dueDate when those land."

C — Industrial/Battery (#16 / 95ba6a2f): SOW confirms 2nd of 2 vertical campaigns. dueDate=7/31. Lock as drafted.

YOUR DIRECTIVE (operator + R1 TP aligned):

1. RE-HYDRATE FROM PROD IN FULL — not summaries. Run `pnpm runway:snapshot --scope=convergix` BEFORE anything else. Convergix data has continued to drift since the wipe (last write timestamp in old snapshot: 2026-05-01T04:31 UTC; that is now ~6+ hours stale).

2. After snapshot, run bounded MCP pulls per your standard: get_data_health, get_clients(includeProjects=true), get_team_members, get_pipeline, find_updates(clientSlug='convergix', since='2026-05-01T04:31:00Z', limit=200). The find_updates pull catches NEW drift between your last snapshot and now — review before scoping anything.

3. Read the recovered files in this order:
   a. `docs/tmp/data/data-tp-handoff-2026-04-30.md`
   b. `docs/tmp/data/convergix-spec-2026-05-01.md`
   c. THIS prompt (already in your context)

4. Diff fresh snapshot vs locked decisions above. Surface to operator any new drift since 2026-05-01T04:31 UTC that contradicts a locked decision.

5. Re-draft the convergix-cards-2026-05-01 triplet from the spec doc + 4 Round 2 fixes. Dispatch drafter agent worktree-isolated per your standard pattern. batchId/updatedBy preserved.

6. Round 2 DRY_RUN. Then 1-panel re-QA on Cascade Integrity (the others passed in Round 1; full re-QA wave not needed unless you flag a new risk).

7. Operator approves. APPLY direct. Verify post-APPLY. Re-snapshot. Closing mechanical sweep (5 categories explicitly named: date conventions + past-dated non-terminal status + resources missing role prefix + stale single-day shape + task-dependent role labels + the 7th if applicable per skill v3). Cohort close.

OPERATIONAL REMINDERS:

- `.env.local` in this worktree is a SYMLINK to the main repo `.env.local`. Don't replace with a copy. SQLite write-trap mitigation.
- Set `set_batch_mode` BEFORE the first write. Default to `batch_apply` for everything (direct update_week_item risks Slack leak even with batch mode active).
- If you discover the on-disk recovered files don't match what you remember from your pre-wipe context: TRUST THE FILES. They were extracted from your own JSONL Write/Edit ops + file-history snapshots. Memory may be foggy post-wipe-disruption; disk is authoritative.
- The QA-partner CC is being re-engaged separately. It will be online to cross-check your Round 2 batch when you get there. No coordination needed from your side — operator handles dispatch.
- If anything looks wrong, halt and ask operator. Do NOT improvise prod writes.

Standing by for: confirmation you've read this, then your re-snapshot output and per-L1 status table.
```

## ===== END PASTE =====

---

## What you (operator) should expect from data-tp

Roughly the same kickoff package it surfaced last time:
- Convergix snapshot summary
- Critical findings (severity-ranked, with diff vs locked decisions for any new drift)
- Per-L1 status table (22 rows, marks against your decisions)
- 4 bundled questions if any new ambiguity surfaces

Pace target: ~30-45 min to a fresh Round 2 DRY_RUN.

If data-tp says "I don't have context" or asks you to re-explain locked decisions — stop. Either the prompt didn't render fully, or it's missed reading the on-disk files. Re-paste, or have it read the files explicitly.
