# OBSOLETE — DO NOT USE

This prompt was written based on a wrong assumption (QA-partner = a separate CC that runs Round 2 re-QA). Actual role split:
- **Holdout panels + code-correctness QA** = data-tp's own subagent dispatch (not a separate top-level CC).
- **Evaluator (separate top-level CC)** = full continuity through the wipe, no re-engagement paste needed. Inserts AFTER data-tp's QA wave, BEFORE operator's APPLY, for back-to-front operator-intent verification.

Evaluator self-corrected my framing in conversation 2026-05-01 ~19:00. The corrected data-tp prompt is at `PASTE-data-tp-correction.md`.

Original (wrong) draft preserved below for audit only.

---

# Original (WRONG) draft — QA-partner re-engagement prompt — paste-ready

Paste the block between the markers into the QA-partner Claude Code session.

**Note for operator:** I (R1 TP) am drafting this with one assumption I want to flag — that the QA-partner is a SEPARATE top-level CC sitting alongside data-tp, whose role is fresh-eyes review of data-tp's batches before APPLY. If that's wrong (e.g., it was actually just data-tp's subagent dispatch all along, or has a different role like operator-evaluator hybrid), tell me and I'll redraft.

---

## ===== PASTE TO QA-PARTNER =====

```
CRITICAL CONTEXT — situation update before resuming QA-partner role:

On 2026-05-01 ~08:38 AM CDT, the operator's `/Users/jasonburks/Documents/_AI_/_R1/` directory was wiped by an unknown event (NOT a Claude Code agent — verified). Local source, worktrees, brain docs, and `.env.local` were lost. Recovery has been performed; here's what you need to know:

**Path translation:**
- Old (WIPED, do not use): `/Users/jasonburks/Documents/_AI_/_R1/...`
- New main repo: `/Users/jasonburks/Documents/_AI_/_R1_RECOVERED/`
- data-tp's worktree: `/Users/jasonburks/Documents/_AI_/_R1_RECOVERED/.worktrees/data-tp-runway/` on branch `feature/data-tp-cluster3` off `upstream/runway`
- If your skill files or memory reference `_R1/...` paths, mentally translate to `_R1_RECOVERED/...`. Operator will canonicalize the rename later.

**Holdout-panel sources (intent ground-truth) for Convergix — likely paths if you need them:**
- Kathy Q&A 4/22, Slack audit log 4/22-4/29, audit log entries: operator pastes when needed
- Convergix project tracker sheet (Google Sheets URL): operator-blessed source of truth, ask operator if you need a fresh paste
- Convergix Retainer SOW (effective 2026-01-26, $100K, contractStart=2026-02-01, contractEnd=2026-07-31, AUTOMATE booth EXCLUDED from retainer scope): summarized in data-tp's prompt

**What's already on disk for cross-reference (non-spec, non-triplet — safe for you to read):**
- `_R1_RECOVERED/docs/tmp/data/data-tp-handoff-2026-04-30.md` (30KB, data-tp's own cross-session handoff)
- `_R1_RECOVERED/docs/recovered/runway-v3-cascade/docs/tmp/data-integrity-audit/convergix-*.md` (historical Convergix audit notes, pre-cards-batch)

What you SHOULDN'T read for Round 2 (holdout discipline):
- data-tp's spec doc at `_R1_RECOVERED/.worktrees/data-tp-runway/docs/tmp/data/convergix-spec-2026-05-01.md`
- data-tp's triplet code at `_R1_RECOVERED/.worktrees/data-tp-runway/scripts/runway-migrations/convergix-cards-2026-05-01{,-verify,-REVERT}.ts` (when it lands)
(Code-correctness panel is the exception — it reads the triplet directly.)

YOUR ROLE (unchanged): cross-check data-tp's prod-write batches with fresh-eyes review. You do NOT autonomously write to prod. Your output is QA findings (CRIT/WARN/PASS by category) that data-tp incorporates before APPLY.

DATA-TP'S CURRENT STATE: re-engaging fresh in their worktree. They are about to:
1. Re-snapshot Convergix prod in FULL (data drifted post-wipe; old snapshot stale)
2. Re-read on-disk recovered files (data-tp-handoff-2026-04-30.md, convergix-spec-2026-05-01.md, retainer-renewal triplet precedent)
3. Re-draft the convergix-cards-2026-05-01 triplet from the spec doc + 4 Round 2 fixes that were identified pre-wipe
4. Run Round 2 DRY_RUN
5. Then ship to you for QA pass before APPLY

WHAT YOU ALREADY DID (Round 1, pre-wipe — for context only, NOT to redo):

Round 1 of convergix-cards-2026-05-01 went through your QA wave (5 holdout panels + 1 code-correctness panel). Results were:
- Panel 1 (Completeness): FAIL on existing prod state, but findings aligned 1:1 with batch coverage. Net new bugs: 0.
- Panel 2 (Consistency): same pattern. Net new bugs: 0.
- Panel 3 (Intent Fidelity): WARN. Items already in batch or covered by Kathy attestations. Net new bugs: 0.
- Panel 4 (Source Attribution): FAIL on existing prod state. Surfaced AISTech "???" notes placeholder (sweep-step item, not in batch scope). Net new bugs: 0.
- Panel 5 (Cascade Integrity): WARN with one real risk — A14 cascade guard expect-0 but Industrial/Battery has existing deadline child. Catch was material.
- Code-correctness QA: APPLY-after-fix. Found D2/D3 dayOfWeek bugs (5/8 is Friday, not Thursday).

Combined: 4 critical fixes identified (D2/D3 dayOfWeek, A14 cascade guard, A10 deadline-deletion-via-cat-flip). data-tp is incorporating all 4 into Round 2.

WHAT YOU'LL NEED TO DO NEXT (Round 2):

Once data-tp ships Round 2 DRY_RUN output, run a TARGETED re-QA pass — NOT a full 6-agent wave. Specifically:
- 1 panel: Cascade Integrity re-check (Panel 5 from Round 1). Verify A14 guard now correctly expects 1 cascade item, AND verify A10 cat-flip recipe sequences correctly (66414d4d goes deadline → delivery BEFORE A10.dueDate=null write).
- Code-correctness re-check on the patched triplet. Look specifically at D2/D3 dayOfWeek values + A14 + A10. Don't re-validate the 96 ops you already cleared in Round 1 (you can spot-check if you're suspicious, but don't burn cycles).

You can skip Panels 1-4 in Round 2 unless data-tp adds new ops beyond the 4 fixes. If they do, get specific about WHICH new ops and run targeted spot-checks on those, not a full re-pass.

OPERATIONAL REMINDERS:

- Holdout panels run BLIND to spec/triplet. You read prod state + intent (from Convergix retainer SOW + tracker sheet + Kathy 4/22 Q&A + Slack 4/22-4/29 audit log). You do NOT read data-tp's spec doc or triplet code before drafting findings — that defeats the holdout pattern. Code-correctness panel is the exception (it reads the triplet directly).
- If you discover the recovered files don't match what you remember from your pre-wipe context: TRUST THE FILES.
- If anything looks wrong, halt and ask operator. Do NOT improvise.

Standing by. data-tp will dispatch you when Round 2 DRY_RUN is ready.
```

## ===== END PASTE =====

---

## What I (R1 TP) need clarified before you paste this

1. **Is QA-partner a separate top-level CC, a subagent dispatch, or something else?** I drafted assuming separate top-level. Adjust framing if wrong.
2. **Does QA-partner have its own worktree?** If yes, similar `.env.local` symlink rules apply. If no (just runs in-context against data-tp's outputs), no setup needed.
3. **Holdout-panel discipline reminder appropriate?** I included the "blind to spec/triplet" reminder because that's the standard holdout discipline I saw in the scrollback. If QA-partner has a different protocol, redraft.

If the framing is right, paste as-is. If not, tell me what to adjust.
