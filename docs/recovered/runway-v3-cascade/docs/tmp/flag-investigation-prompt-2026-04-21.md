# Flag-panel anomaly investigation — diagnosis-only prompt

**Status:** Ready for TP handoff. NOT part of PR 89. Precedes any flag-related code PR.
**Origin:** CC's board QA agent (2026-04-21 post-migration) surfaced two anomalies. Each needs root-cause diagnosis before any fix is proposed.

## Paste to TP

```
Two flag-panel anomalies surfaced by CC's board QA agent. Both
need diagnosis BEFORE any code change. Deploy investigator
agents; bring findings back to me and CC before proposing fixes.

=== Anomaly 1: Stale display counts ===

Board right-rail shows:
  WARNING: Kathy has 33 deliverables in 10 days (LPPC, Convergix)
  WARNING: Jill has 8 deliverables in 10 days (Soundly, Bonterra,
           High Desert Law, Hopdoddy)

Post-migration DB reality (queried fresh after apply):
  Kathy: 24 items in 10-day window
  Jill: 4 items in 10-day window

Delta: 9 items overcounted for Kathy, 4 overcounted for Jill.

Possible root causes to investigate (pick one — don't assume):
a) Next.js ISR / route cache serving pre-migration HTML.
   Revalidate-path not firing for the flags route after
   migration writes hit the DB.
b) The flag query uses a wider definition than "active L2
   deliverables in 10 days" — maybe includes L1 projects,
   cascaded items, or items in terminal statuses.
c) Detector runs on a different time window (14 days?
   calendar week?) than the agent used for comparison.
d) Double-counting from a JOIN or cross-product.

Agent brief: read detectResourceConflicts in
src/lib/runway/flags-detectors.ts (or wherever in flags.ts).
Trace the exact query definition. Run that query against prod
to get the REAL numbers the detector computes. Compare to the
24 and 4 the broader DB scan returned. If detector agrees with
broad scan (Kathy 24 / Jill 4) then the display is stale —
investigate cache. If detector says 33 / 8 the display is
current and the agent's query definition was narrower — report
the semantic gap.

Output: 3-5 bullet diagnosis, no fix proposal yet.

=== Anomaly 2: Stale-items detector output missing from panel ===

Code path: src/lib/runway/flags-detectors.ts exports
detectStaleItems() which flags L1s with updated_at >= 14 days
ago and non-terminal status. QA agent found 3+ L1s that qualify
(Organic Social + Playbook, Plastic Additives LinkedIn Post —
Beyond Petrochemicals, others). None surfacing on the live board.

Possible root causes:
a) detectStaleItems not called from analyzeFlags.
b) analyzeFlags calls it but filters results out before render.
c) FlagsPanel receives the results but doesn't render that
   category.
d) Staleness threshold mismatch (code says 14 days, detector
   inputs use a different timestamp column than updated_at).

Agent brief: trace detectStaleItems from definition to final
render. Find where stale-item results drop. Report which of
a/b/c/d is the cause.

Output: file path + line number where the drop happens + one-line
summary of the fix shape (no code yet).

=== Constraints ===

- READ-ONLY. No code edits. No DB writes.
- No deploy agents, no revalidation triggers, no cache busting.
  We're diagnosing, not patching.
- Both agents run in parallel (independent code paths).
- Report back within 10 min. Short, punchy, no hedging.
- Flag anything weird beyond the asked-for items.

After both reports return, bring them to CC with clear
root causes. CC either folds the fixes into PR 89 (if touching
the flags surface we're already refactoring) or stands up a
separate small PR, depending on fix size and scope.
```

## Expected decision flow after diagnosis

- If Anomaly 1 root cause is cache/ISR → probably a `revalidatePath('/runway')` call missing after migration writes. Tiny fix. Can ride PR 89 if adjacent to the flags refactor we're already doing.
- If Anomaly 1 root cause is query-definition drift → bigger decision: do we change the detector's semantics or correct the label text? Needs operator input, not a pure code fix.
- If Anomaly 2 root cause is (a) or (b) — wire-up bug. Probably rides PR 89 since we're touching `analyzeFlags` and `FlagsPanel` already.
- If Anomaly 2 root cause is (c) or (d) — different surface, probably still rides PR 89 since we're already in the flags neighborhood.

Net: diagnosis first, fix scope determined by root cause. PR 89 is the likely home for any resulting fix because we're already refactoring the same files.
