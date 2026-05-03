# PASTE — Evaluator path correction (R1 TP fresh-context, 2026-05-01 ~19:40)

> Drop this into the evaluator CC session. Tight. One ack expected.

---

```
Path correction from R1 TP (fresh-context post-compact).

Your role framing is right — keep it. You are the evaluator, not the QA-partner. data-tp dispatches the holdout panels + code-correctness QA themselves. You hold operator-intent across the day, run back-to-front independent verification AFTER data-tp's QA wave passes, and hand the operator a verdict before APPLY. No worktree for you; you read data-tp's outputs from main-repo context. All correct.

Your path translation is what's stale. The previous R1 TP told you "_R1 → _R1_RECOVERED" before the rename had happened. That step has since landed:

  cd ~/Documents/_AI_ && rm -rf _R1 && mv _R1_RECOVERED _R1
  cd ~/Documents/_AI_/_R1 && git worktree repair ~/Documents/_AI_/_R1/.worktrees/{data-tp-runway,gantt-cli,slack-modal}

Canonical path NOW is `_R1/`. Your older memory references to `_R1/...` are correct again. Anywhere a doc or memory says `_R1_RECOVERED/...`, read it as `_R1/...` — that prefix is stale audit-trail wording.

Concrete paths you'll need at the gate:

- Triplet:    ~/Documents/_AI_/_R1/.worktrees/data-tp-runway/scripts/runway-migrations/convergix-cards-2026-05-01{,.verify,.REVERT}.ts
- Spec:       ~/Documents/_AI_/_R1/.worktrees/data-tp-runway/docs/tmp/data/convergix-spec-2026-05-01.md
- R2 snapshot: ~/Documents/_AI_/_R1/.worktrees/data-tp-runway/docs/tmp/data/convergix-snapshot-2026-05-01-r2.json (data-tp will produce this in the next pass — option B + write-to-disk)
- Locked decisions Q1-Q4 + new context A/B/C: ~/Documents/_AI_/_R1/docs/recovered/data-tp/data-tp-paste-extraction-2026-05-01.md (Paste 1 section)
- Round 2 fix list (4 patches):
    1. D2 dayOfWeek="thursday" → "friday" (5/8 is Friday)
    2. D3 dayOfWeek="thursday" → "friday"
    3. A14 cascade guard: Industrial/Battery has existing deadline child 8f9cacca (date=7/31). Guard must expect 1 cascade item, not 0
    4. A10 dueDate=null write requires cat-flip on 66414d4d "May Content Calendar Draft" (deadline → delivery) BEFORE the dueDate=null write so cascade doesn't clear its date

cd to ~/Documents/_AI_/_R1/ when you next need a working dir for verification commands.

No re-engagement paste, no role re-brief — your continuity is intact. Just re-anchor on the canonical path and stand by until data-tp signals "Round 2 DRY_RUN green + Cascade re-QA passed, ready for evaluator." Operator pauses there for your back-to-front verdict.

Ack the path correction and we're done.
```

---

## TP notes (don't paste)

- Evaluator's role correction was sound. The prior R1 TP wrote a `PASTE-qa-partner-reengagement.md` (now marked OBSOLETE) that conflated evaluator with QA-partner. Evaluator self-corrected. We accept their framing.
- Only confusion remaining is the path translation — `_R1_RECOVERED → _R1` rename had happened by the time of evaluator's response, but R1 TP previous didn't propagate the canonical-path update to evaluator. Fixed by this paste.
- Insertion point preserved: data-tp signals "DRY_RUN green + Cascade re-QA passed" → operator pauses → evaluator runs back-to-front → verdict → operator fires APPLY.
