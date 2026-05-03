# Evaluator learnings — accumulated patterns

A journal. Each entry is a pattern observed across one or more sessions where the templates didn't pre-flag what mattered. Patterns mature into template additions; outdated entries get pruned.

## Format

```markdown
## <YYYY-MM-DD> — <one-line title>

**Pattern:** <what was observed>
**Evidence:** <which session(s), which artifact, what specifically>
**Why it mattered:** <consequence if missed>
**What to do next time:** <concrete action — adds to a template, raises confidence threshold, etc.>
**Mature into template?** <yes/no/maybe — if yes, which file>
```

## Entries

### 2026-05-02 — Verify file claims before greenlighting handoff docs

**Pattern:** Handoff docs that list "files on disk" can claim files that don't exist (or omit files that do). Easy to skip with "of course they're there" assumption.

**Evidence:** Convergix cohort handoff doc 2026-05-02 listed 6 disk artifacts + 9 triplets. All 15 verified by `ls`. Without the verification, a missing file could ship and successor TP would hit a 404 on hydration. Already in template — note as enforced.

**Why it mattered:** Successor TP relies on the file index to know what to read. Wrong index = wasted hydration cycle on a non-existent file or skipped read on a missed file.

**What to do next time:** Always `ls` the cited paths before greenlighting. Cross-check-templates.md § Handoff doc lists this; treat as non-optional.

**Mature into template?** Already in template — enforced.

### 2026-05-02 — Cross-check skill-patch evidence against triplet/spec, not just snapshot

**Pattern:** Skill v4 patch candidates can have mismatched evidence — claim a write happened in batch X when it actually happened in batch Y, or claim a category flip on a row that didn't have one. Snapshot may not catch this if the snapshot doesn't enumerate every op.

**Evidence:** v4 patch #20 evidence claimed "convergix-cards-2026-05-01 forced into triplet because Card 1 (Cert Page)" — Cert Page was actually in status sweep batch, not cards. Caught by reading the convention sweep spec + triplet directly.

**Why it mattered:** Skill patches inform future-session methodology. Misattributed evidence makes the patch read as wrong even when the pattern is real, weakens operator confidence in the patch list.

**What to do next time:** For every patch evidence claim citing a specific row + batch, grep the triplet or spec to confirm the row is actually in that batch and the cited write actually happened. Don't trust evidence by reasoning — verify by reading.

**Mature into template?** Already in template — reinforce.

### 2026-05-02 — Stream-of-consciousness leaks in data-tp's docs

**Pattern:** data-tp sometimes leaves mid-thought interruptions in committed docs — phrases like "wait, current=X" or "actually maybe Y" that look like internal deliberation, not finalized doc text.

**Evidence:** Convergix snapshot 2026-05-02-final.json line 121 had `"Texas Instruments Article (c0935359, startDate=2026-04-22 — wait, current=2026-04-22)"`. Cleaned at evaluator request.

**Why it mattered:** Doc readability for successor TP. These leaks signal "data-tp wasn't sure" but committed anyway, which is confusing without context.

**What to do next time:** Scan committed docs for "wait", "actually", "—" mid-claim, "TBD" in finalized sections, or any phrasing that reads like internal monologue. Flag for cleanup.

**Mature into template?** Added to handoff doc + snapshot templates as a hygiene check.

### 2026-05-02 — File-handoff pattern significantly reduces operator friction

**Pattern:** Old pattern: operator copy-pastes data-tp's full output back to evaluator. New pattern: data-tp writes artifact + signal file; evaluator reads disk; operator only relays one-line acknowledgments.

**Evidence:** Convergix cohort close 2026-05-02 used file-handoff for snapshot, handoff doc, and skill v4 candidates. Operator's relay overhead dropped from paragraphs to one-liners. Evaluator's cross-checks unchanged in depth.

**Why it mattered:** Operator can step away from terminal between checkpoints. Reduces the "operator as courier" failure mode.

**What to do next time:** Default to file-handoff for any artifact >50 words. Inline acknowledgments only for short verdicts.

**Mature into template?** Canonized in SKILL.md § Communication.

### 2026-05-02 — Parent date overrides clobbered by child-triggered recompute (CRITICAL)

**Pattern:** When a batch includes (a) a parent L1 date override AND (b) child L2 writes that trigger parent recompute, op order matters. If parent override writes first, child writes recompute the parent and clobber the override. Silent until verify catches it.

**Evidence:** Convergix status sweep 2026-05-02. Op 4 wrote Rockwell Co-Marketing endDate=5/16; ops 6-11 (Card 4 Daniel Scope Ask child writes) triggered recompute on Rockwell L1, max-of-children=5/5 clobbered the 5/16 override. Required convergix-status-sweep-2026-05-02-fix sub-batch (1-row override re-fire). Caught 3rd time today.

**Why it mattered:** Silent prod data loss. Caught only because verify scripts had explicit assertions on Card 2 endDate. If verify weren't there, the clobber would have shipped.

**What to do next time:** On any cross-check of a spec or triplet that touches both parent date overrides AND child L2 writes on that parent, verify op-order: parent override comes AFTER all child writes. If op-order is impossible due to cascading parent dependencies, expect a post-batch fix-override batch with bumped updatedBy. Surface to operator as decision point.

**Mature into template?** Added as explicit check in spec + triplet templates. Also queued as skill v4 patch #25 for landing.

### 2026-05-02 — Branch tracking can silently point at deploy branch

**Pattern:** Feature branches can have their upstream tracking pointed at the canonical deploy branch (e.g., `upstream/runway`) without the user noticing. A bare `git push` would push commits to deploy.

**Evidence:** `feature/data-tp-cluster3` was tracking `upstream/runway` until data-tp explicitly pushed to `origin/feature/data-tp-cluster3` with `-u` flag.

**Why it mattered:** Near-miss for shipping data-only commits to production deploy branch.

**What to do next time:** Before any `git push` on a feature branch, verify tracking with `git branch -vv`. If tracking is wrong, fix with `git push -u origin <branch>` to reset.

**Mature into template?** Add to handoff doc template under "git hygiene checks" if commit/push falls under evaluator scope. Otherwise note in successor-TP handoff sections.

## Pruning

When an entry's "What to do next time" matures into a template addition, mark the entry as `(matured to template <X>)` and leave it for a session, then prune. Keeps the file from growing indefinitely.
