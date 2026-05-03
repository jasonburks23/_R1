# Data TP correction prompt — paste-ready

Paste AFTER:
1. Rename complete (`mv _R1_RECOVERED _R1`)
2. data-tp has run `cd ~/Documents/_AI_/_R1/.worktrees/data-tp-runway && pwd` and confirmed cwd

This corrects two things from my first prompt:
1. The path translation now says `_R1_RECOVERED → _R1` (rename happened, paths are canonical)
2. Removes my mis-framing of "QA-partner runs Round 2 re-QA" — that's data-tp's own subagent dispatch. Evaluator inserts BEFORE APPLY, not as part of QA wave.

---

## ===== PASTE TO DATA TP =====

```
Course correction from R1 TP — two updates:

1. PATH RENAME COMPLETE
   _R1_RECOVERED has been renamed to _R1. Your worktree is now at /Users/jasonburks/Documents/_AI_/_R1/.worktrees/data-tp-runway/ — the canonical path. Anywhere I previously said "_R1_RECOVERED/...", read it as "_R1/..." now. Skill files at ~/.claude/skills/data-integrity-tp/ unaffected (always lived outside _R1/).

   First action: re-anchor your cwd and verify the worktree is healthy.

   Run this single command:
   cd ~/Documents/_AI_/_R1/.worktrees/data-tp-runway && pwd && ls -la .env.local && ls docs/tmp/data/convergix-spec-2026-05-01.md && git status -s -b

   Expected output:
   - pwd: /Users/jasonburks/Documents/_AI_/_R1/.worktrees/data-tp-runway
   - .env.local: lrwxr-xr-x ... -> ../../.env.local
   - convergix-spec-2026-05-01.md exists
   - branch: feature/data-tp-cluster3

2. ROLE BOUNDARY CORRECTION (my error in first prompt)

   I incorrectly told you the "QA-partner" runs the Round 2 re-QA (1 panel + code-correctness re-check). That's WRONG. The role split is:

   a. Holdout panels (5) + code-correctness QA (1) = YOUR worktree-isolated subagent dispatch during your Round N QA wave. Blind-to-spec discipline applies to the panels. Same pattern as Round 1.

   b. Evaluator (separate top-level CC, full continuity through wipe) = holds operator-intent across the day (Q1-Q4 locks, SOW context, sweep deferrals), runs back-to-front independent verification AFTER your QA wave passes, BEFORE operator fires APPLY. Reads everything (spec, triplet, prod state, intent context). NOT blind.

   So Round 2 re-QA is YOUR dispatch, not the evaluator's. The evaluator inserts at the gate before APPLY, separately from your wave.

CORRECTED FLOW (operator + evaluator + R1 TP aligned):

   1. Re-snapshot Convergix prod IN FULL (pnpm runway:snapshot --scope=convergix). Do NOT rely on stale snapshot — drift is real since 2026-05-01T04:31 UTC.
   2. Bounded MCP pulls per your standard: get_data_health, get_clients(includeProjects=true), get_team_members, get_pipeline, find_updates(clientSlug='convergix', since='2026-05-01T04:31:00Z', limit=200).
   3. Read recovered files: docs/tmp/data/convergix-spec-2026-05-01.md (Round 1 spec), ../../docs/tmp/data/data-tp-handoff-2026-04-30.md (your handoff), and the 4/26 retainer renewal triplet at scripts/runway-migrations/ as precedent.
   4. Diff fresh snapshot vs locked decisions (Q1-Q4 + A/B/C). Surface any new drift to operator.
   5. Re-draft the convergix-cards-2026-05-01 triplet from spec + 4 Round 2 fixes (D2/D3 dayOfWeek="friday", A14 cascade guard expect=1, A10 cat-flip 66414d4d deadline→delivery BEFORE A10.dueDate=null write). batchId=convergix-cards-2026-05-01, updatedBy=data-tp-2026-05-01 (preserved — no APPLY happened in Round 1).
   6. Round 2 DRY_RUN.
   7. YOUR targeted re-QA dispatch: 1 Cascade Integrity panel + code-correctness re-check on patched triplet. Skip Panels 1-4 unless you added new ops beyond the 4 fixes.
   8. When your wave passes, signal operator: "Round 2 DRY_RUN green, re-QA clean, ready for evaluator + APPLY." DO NOT fire APPLY yourself. Operator triggers evaluator's back-to-front verification first.
   9. Evaluator runs back-to-front pass against operator-locked intent. Verdict GREEN/YELLOW/RED to operator.
   10. Operator APPLY gate. If GREEN, operator pastes APPLY command to you.
   11. You APPLY → verify post-APPLY → re-snapshot → closing mechanical sweep (5 categories explicitly named) → cohort close.

The "ready for evaluator + APPLY" signal at step 8 is the explicit handoff to the gate. Evaluator inserts BETWEEN your wave and the actual prod write.

OPERATIONAL REMINDERS (unchanged):

- .env.local in your worktree is a SYMLINK. Don't replace.
- set_batch_mode BEFORE first write. Default to batch_apply for everything.
- If on-disk recovered files don't match memory: TRUST THE FILES.
- Halt and ask operator if anything looks wrong.

Standing by. Confirm cwd/env, then proceed with snapshot.
```

## ===== END PASTE =====

---

## Notes for operator (not pasted to data-tp)

- The QA-partner prompt file is now obsolete. Evaluator has continuity, doesn't need a paste. Mark `PASTE-qa-partner-reengagement.md` as "do not use — evaluator already has full context."
- After data-tp's snapshot output lands, expect a per-L1 status table again (probably very similar to Round 1 since locked decisions are unchanged) plus any NEW drift since 2026-05-01T04:31 UTC.
- The evaluator's back-to-front verification is the gate. Operator pauses APPLY for it.
